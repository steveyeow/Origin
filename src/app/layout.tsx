import type { Metadata } from "next";
import { Space_Grotesk, Fira_Code } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from '@/components/auth/AuthProvider';

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
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
        className={`${spaceGrotesk.variable} ${firaCode.variable} font-sans antialiased overflow-x-hidden`}
      >
        <AuthProvider>
          <ThemeProvider initialTheme="white">
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
