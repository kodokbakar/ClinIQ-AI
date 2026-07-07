import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "clinIQ AI — Asisten klinik yang lebih tenang",
  description:
    "Ruang kerja AI yang membantu klinik merapikan intake pasien, catatan triase, dan ringkasan kunjungan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${fraunces.variable} ${nunitoSans.variable}`}>
        {children}
      </body>
    </html>
  );
}
