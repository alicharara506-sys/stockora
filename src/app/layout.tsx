import type { Metadata } from "next";
import { Inter, Poppins, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/components/ui/theme-toggle";
import { getMessages } from "@/lib/i18n/server";
import { localeDir } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/client";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// Inter and Poppins carry no Arabic glyphs, so Arabic would fall back to
// whatever the OS provides — inconsistent, and often poorly hinted. This is
// attached only when the locale is Arabic, so Latin users never download it.
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Stockora — Smart Retail POS & Inventory",
  description:
    "Stockora is the all-in-one cloud POS and inventory management platform built for apparel, footwear, and modern retail businesses.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getMessages();
  const dir = localeDir(locale);

  return (
    // lang and dir are set from the request's locale: `dir="rtl"` is what
    // mirrors the entire layout for Arabic — CSS logical properties, flex
    // order and scrollbars all follow it, so no per-component RTL rules.
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${poppins.variable} ${locale === "ar" ? notoArabic.variable : ""} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before the first paint, so a dark-mode
            user never sees a white flash. Must stay inline and synchronous. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-brand-bg text-brand-black">
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
