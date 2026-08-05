import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/components/ui/theme-toggle";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Stockora — Smart Retail POS & Inventory",
  description:
    "Stockora is the all-in-one cloud POS and inventory management platform built for apparel, footwear, and modern retail businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before the first paint, so a dark-mode
            user never sees a white flash. Must stay inline and synchronous. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-brand-bg text-brand-black">
        {children}
      </body>
    </html>
  );
}
