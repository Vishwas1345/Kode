import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/client/components/ui/sonner";
import { TooltipProvider } from "@/client/components/ui/tooltip";
import { TRPCReactProvider } from "@/server/trpc/client";
import { PremiumModal } from "@/client/components/premium-modal";

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
  title: "Kode - AI Website Builder",
  description: "Build beautiful structured React websites with AI instantly. Powered by Kode.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#00FF88",
        },
      }}
    >
      <TRPCReactProvider>
        <html lang="en" suppressHydrationWarning className="dark">
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-[#00FF88] selection:text-[#0B0F0C]`}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              forcedTheme="dark"
              disableTransitionOnChange
            >
              <TooltipProvider>
                <Toaster />
                <PremiumModal />
                {children}
              </TooltipProvider>
            </ThemeProvider>
          </body>
        </html>
      </TRPCReactProvider>
    </ClerkProvider>
  );
};
