import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Data Dashboard",
  description: "Upload a sales CSV and see your numbers. Everything runs in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
