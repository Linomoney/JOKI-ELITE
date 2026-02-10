import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";

// Lazy load heavy components
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BANDIT JOKI - Jasa Joki Tugas, Skripsi, Coding Terpercaya #1 di Indonesia",
  description: "Jasa joki tugas kuliah, skripsi, coding, dan desain profesional dengan harga terjangkau. Garansi tepat waktu, revisi unlimited, dan kualitas terbaik.",
  keywords: "joki tugas, joki skripsi, joki coding, jasa pembuatan tugas kuliah, jasa skripsi murah, joki tugas online, jasa coding murah",
  authors: [{ name: "BANDIT JOKI Team" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://banditjoki.com",
    title: "BANDIT JOKI - Jasa Joki Tugas & Skripsi Terpercaya #1",
    description: "Solusi cepat untuk tugas kuliah, skripsi, coding dengan tim profesional.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="canonical" href="https://banditjoki.com" />
        <meta name="theme-color" content="#050505" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050505] text-white overflow-x-hidden`}
        suppressHydrationWarning
      >
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}