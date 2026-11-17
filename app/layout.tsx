import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font, so there's no request to Google Fonts and no flash of fallback text.
const display = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-space-grotesk" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Shourya Baranwal — Mechatronics Engineer",
  description: "Mechanical engineering student at the University of Calgary: solar car, robotics, and mechanism design.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
