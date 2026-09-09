import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Track Quality Pack",
  description:
    "Digital Track Quality Pack for Network Rail track engineering staff on laptops, iPads and iPhones.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="min-h-dvh bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
