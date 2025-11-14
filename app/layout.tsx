import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduHive Admin Panel",
  description: "Admin panel for EduHive learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
