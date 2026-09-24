import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { stackOrderScript } from "@/lib/stack-order";
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
  title: "Get the stack",
  description: "Shareable links for GitHub stacked pull requests",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The inline script below may add data-stack-order before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: stackOrderScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="mx-auto w-full max-w-3xl px-4 pt-6">
          <Link
            href="/"
            className="font-mono text-sm text-neutral-500 hover:text-foreground"
          >
            getthestack
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
