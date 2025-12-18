import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import StyledComponentsRegistry from './registry';
import { ThemeProvider } from '@/lib/theme/ThemeContext';
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
  title: {
    default: "UNFOLD - Time Management System",
    template: "%s | UNFOLD",
  },
  description: "UNFOLD is a comprehensive time management system for organizing programs, projects, tasks, and subtasks with visual timetable views.",
  keywords: ["time management", "task management", "productivity", "scheduling", "project management", "timetable"],
  authors: [{ name: "UNFOLD" }],
  creator: "UNFOLD",
  publisher: "UNFOLD",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "UNFOLD",
    title: "UNFOLD - Time Management System",
    description: "Comprehensive time management system for organizing programs, projects, tasks, and subtasks with visual timetable views.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "UNFOLD Time Management System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UNFOLD - Time Management System",
    description: "Comprehensive time management system for organizing programs, projects, tasks, and subtasks.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon_light.svg", media: "(prefers-color-scheme: light)" },
      { url: "/favicon_dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [
      { url: "/favicon_light.svg", media: "(prefers-color-scheme: light)" },
      { url: "/favicon_dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "UNFOLD",
    "description": "Comprehensive time management system for organizing programs, projects, tasks, and subtasks with visual timetable views.",
    "url": siteUrl,
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Time management",
      "Task organization",
      "Project management",
      "Visual timetable views",
      "Program tracking",
      "Subtask management"
    ]
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0, padding: 0, minHeight: '100vh', width: '100%', overflowX: 'hidden' }}
      >
        <StyledComponentsRegistry>
          <ThemeProvider>{children}</ThemeProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}