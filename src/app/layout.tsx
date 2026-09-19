import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { OfflineSyncBanner } from "@/components/layout/OfflineSyncBanner";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CivicPulse — Municipal Operations Platform",
  description:
    "Civic complaint triage, work order dispatch, and governance tracking platform for municipal operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
        <OfflineSyncBanner />
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

