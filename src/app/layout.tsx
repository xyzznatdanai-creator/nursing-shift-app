import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nursing Shift",
  description: "ระบบจัดการตารางเวรพยาบาล",
  manifest: "/manifest.json",
  // iOS Safari only supports Web Push once the site is added to the home
  // screen as a standalone app — this tag is what makes "เพิ่มไปยังหน้าจอ
  // โฮม" produce an app-like icon/launch instead of a plain bookmark.
  appleWebApp: { capable: true, title: "Nursing Shift", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
