"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // Tambahkan "/login" ke dalam pengecekan agar Navbar tidak muncul
  const hideNavbarPaths = ["/admin", "/login"];
  const showNavbar = !hideNavbarPaths.some(path => pathname.startsWith(path));

  return (
    <html lang="en" className="dark scroll-smooth"> 
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#05070a] text-white overflow-x-hidden`}
      >
        {/* Navbar otomatis hilang di Dashboard Admin & Page Login */}
        {showNavbar && <Navbar />}
        
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}