// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import SplashAnimation from "@/components/SplashAnimation";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quiniela ⚽ — Predice, Compite, Gana",
  description:
    "Plataforma de quinielas de fútbol en tiempo real. Pronostica marcadores, compite con amigos y escala en la tabla de posiciones.",
  keywords: ["quiniela", "fútbol", "pronósticos", "predicciones", "liga mx"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Quiniela",
  },
  icons: {
    icon: "/logo-192.png",
    shortcut: "/logo-192.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Quiniela ⚽",
    description: "Predice marcadores, compite con amigos y gana.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#080810",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={outfit.variable}>
      <body className="bg-mesh min-h-screen overflow-x-hidden">
        <SplashAnimation />
        {children}
      </body>
    </html>
  );
}

