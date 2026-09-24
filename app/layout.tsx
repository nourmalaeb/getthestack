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
      <body className="min-h-dvh">
        <div className="max-w-3xl p-4 mx-auto min-h-dvh flex flex-col">
          <header className="w-full">
            <Link href="/" className="font-mono text-sm text-secondary hover:text-foreground">
              getthestack
            </Link>
          </header>
          <div className="grow flex flex-col">{children}</div>
          <footer>
            <p className="text-sm text-secondary">A simple tool by Nour Malaeb.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
