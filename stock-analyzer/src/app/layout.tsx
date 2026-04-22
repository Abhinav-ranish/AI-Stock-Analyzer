import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import { Providers } from "@/providers";

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
    default: "AI Stock Analyzer | Smart Financial Insights",
    template: "%s | AI Stock Analyzer"
  },
  description: "AI-assisted stock evaluation tool that leverages Google's Gemini LLM for deep financial analysis, technical indicators, and real-time market news.",
  keywords: ["stock analysis", "AI stock evaluation", "Gemini AI", "financial insights", "portfolio tracking", "tradingview charts", "market analysis"],
  authors: [{ name: "AI-Stock-Analyzer Team" }],
  creator: "AI-Stock-Analyzer",
  publisher: "AI-Stock-Analyzer",
  metadataBase: new URL("https://ai-stock-analyzer.example.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ai-stock-analyzer.example.com",
    title: "AI Stock Analyzer - Smart Financial Insights",
    description: "Evaluate stocks using AI. Get fundamentals, technical analysis, and insider trading insights in one place.",
    siteName: "AI Stock Analyzer",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AI Stock Analyzer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Stock Analyzer - Smart Financial Insights",
    description: "Evaluate stocks using AI. Get deep financial analysis and real-time insights.",
    creator: "@aistockanalyzer",
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
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Navbar />
            {/* Main content area */}
            {children}
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
