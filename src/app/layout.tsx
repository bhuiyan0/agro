import type { Metadata, Viewport } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const bengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali", "latin"],
});

export const metadata: Metadata = {
  title: "গ্রিন হিল",
  description: "বাগানের দৈনিক হিসাব ও কাজের রিপোর্ট",
  appleWebApp: { capable: true, title: "গ্রিন হিল", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#166534",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" className={`${bengali.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans text-lg">
        <ServiceWorker>{children}</ServiceWorker>
      </body>
    </html>
  );
}
