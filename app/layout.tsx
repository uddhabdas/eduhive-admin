import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduHive Admin Panel",
  description: "Admin panel for managing EduHive learning platform - Courses, Lectures, Users, and Wallet Management",
  keywords: ["EduHive", "Admin", "Learning Platform", "Course Management"],
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
