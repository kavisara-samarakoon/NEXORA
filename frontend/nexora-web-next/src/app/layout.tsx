import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "NEXORA — Every Game. Every Deal. One Place.",
    template: "%s | NEXORA",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "gaming",
  keywords: [
    "NEXORA",
    "game deals",
    "free game giveaways",
    "gaming wishlist",
    "game discovery",
    "gaming account security",
    "gaming dashboard",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: "NEXORA — Every Game. Every Deal. One Place.",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/brand/nexora-logo.png",
        width: 1254,
        height: 1254,
        alt: "NEXORA gaming command center logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "NEXORA — Every Game. Every Deal. One Place.",
    description: SITE_DESCRIPTION,
    images: ["/brand/nexora-logo.png"],
  },
  icons: {
    icon: [{ url: "/brand/nexora-logo.png", type: "image/png", sizes: "1254x1254" }],
    apple: [{ url: "/brand/nexora-logo.png", type: "image/png", sizes: "1254x1254" }],
    shortcut: ["/brand/nexora-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
