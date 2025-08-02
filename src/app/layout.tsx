import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OriginX - Your Generative Universe",
  description: "A real-time generative content engine that thinks, feels, and creates with you. Experience the future of AI-powered creativity and content consumption.",
  keywords: ["AI", "generative", "creative", "real-time", "content", "universe"],
  authors: [{ name: "OriginX Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${firaCode.variable} font-sans antialiased overflow-x-hidden`}
      >
        <ThemeProvider initialTheme="white">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
