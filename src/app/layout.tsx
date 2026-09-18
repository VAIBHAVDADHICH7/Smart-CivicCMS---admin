import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { OfflineSyncBanner } from "@/components/layout/OfflineSyncBanner";

export const metadata: Metadata = {
  title: "CivicPulse — City Services Portal",
  description:
    "Report civic issues, track repairs, and hold your city accountable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
        <OfflineSyncBanner />
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>CivicPulse — City Services Portal</span>
            <span>© 2024 Municipal Corporation</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
