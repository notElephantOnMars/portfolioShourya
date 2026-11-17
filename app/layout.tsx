import type { Metadata } from "next";
import { Instrument_Sans, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

// Same type as the Echoes of Exploration (NASA Space Apps) site: Instrument Sans for headings and body,
// Spline Sans Mono for labels. Self-hosted at build time by next/font.
const sans = Instrument_Sans({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-instrument" });
const mono = Spline_Sans_Mono({ subsets: ["latin"], variable: "--font-mono-face" });

export const metadata: Metadata = {
  title: "Shourya Baranwal — Mechatronics Engineer",
  description: "Mechanical engineering student at the University of Calgary: solar car, robotics, and mechanism design.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
