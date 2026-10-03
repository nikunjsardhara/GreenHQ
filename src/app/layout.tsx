import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OatLoader } from "@/components/oat";
import { PwaRegister } from "@/components/pwa";
import { ToastHost } from "@/components/toast-host";
import { GlobalLoader } from "@/components/global-loader";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "GreenHQ - Plant Trees.", template: "%s · GreenHQ" },
  description:
    "Execute plantation drives and tracks - QR-tagged saplings, field activation, and tree gifting.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/greenhq-logo-v2.svg", apple: "/greenhq-logo-v2.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GreenHQ" },
  formatDetection: { telephone: false },
  openGraph: { siteName: "GreenHQ", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#2e7d32",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <OatLoader />
        <PwaRegister />
        <GlobalLoader />
        <ToastHost />
        {children}
      </body>
    </html>
  );
}
