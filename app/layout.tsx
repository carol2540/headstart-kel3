import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AHM Motor Intelligence",
  description: "AI assistant untuk data motor bekas dan brosur Honda Vario 125",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
