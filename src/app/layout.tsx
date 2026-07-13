import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "StoryDid", description: "AI-assisted historical story research" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
