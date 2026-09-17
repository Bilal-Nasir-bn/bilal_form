import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Try-On Survey",
  description:
    "Quick feedback survey for the AI virtual try-on experience at Fawad Fabrics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
