import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getRequestMessages } from "@/lib/request-locale";
import { getRequestTheme } from "@/lib/request-theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getRequestMessages();

  return {
    title: "auto-x-to-wechat",
    description: messages.metadata.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getRequestMessages();
  const theme = await getRequestTheme();

  return (
    <html
      lang={locale}
      className={theme === "dark" ? "dark" : ""}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppShell locale={locale} theme={theme}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
