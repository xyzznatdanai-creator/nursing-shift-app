// V1.4 — Client-side Web Push helpers. Browser-only: every function here
// touches `navigator`/`window`, so it must only ever run in a Client
// Component (never during Server-Side Rendering).

export type PushSupportStatus =
  | "supported"
  | "unsupported-browser"
  | "ios-needs-home-screen";

/**
 * Checks whether this browser/device can receive push notifications at
 * all, and — for iOS Safari specifically — whether the extra "Add to Home
 * Screen" step (Apple's only way to allow Web Push, from iOS 16.4) still
 * needs to happen. Never assume push works; always check first, per the
 * spec's explicit "ตรวจสอบ Capability ก่อนใช้งาน" requirement.
 */
export function getPushSupportStatus(): PushSupportStatus {
  if (typeof window === "undefined") return "unsupported-browser";

  const hasCoreApis =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  const ua = window.navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  if (isIOS && !isStandalone) {
    // iOS Safari reports Notification/PushManager as present even when it
    // won't actually deliver anything until the site is installed — so
    // this check must come before trusting hasCoreApis on iOS.
    return "ios-needs-home-screen";
  }

  return hasCoreApis ? "supported" : "unsupported-browser";
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/** Registers /sw.js (idempotent — safe to call every time the settings page loads). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw.js");
}

/** Reads the browser's current permission without prompting. */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Full opt-in flow: ask permission (must be called from a user gesture,
 * e.g. a button click — never automatically on page load), then create a
 * push subscription and save it server-side.
 */
export async function enablePushNotifications(
  vapidPublicKey: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "denied" };
  }

  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const json = subscription.toJSON();
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });

  if (!response.ok) {
    return { ok: false, error: "save-failed" };
  }
  return { ok: true };
}

/** Turns push off: unsubscribes this browser and removes its saved subscription. */
export async function disablePushNotifications(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!("serviceWorker" in navigator)) return { ok: true };

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return { ok: true };

  const endpoint = subscription.endpoint;
  try {
    await subscription.unsubscribe();
  } catch {
    // Continue anyway — we still want to remove the server-side row.
  }

  const response = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok) return { ok: false, error: "remove-failed" };
  return { ok: true };
}

/** Whether this browser currently has an active push subscription (checked on mount). */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
