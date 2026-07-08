import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { UserProvider } from "@/app/contexts/UserContext";
import "./globals.css";
import "react-datepicker/dist/react-datepicker.css";
import { ThemeToaster } from "@/components/theme-toaster";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "VASPP RM System",
  description: "AI Powered Resource Management System",
};

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider>
            {children}
            <ThemeToaster />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
