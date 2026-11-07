import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "雀ポスト (JanPost) | 麻雀何切る投稿・投票プラットフォーム",
  description: "迷った一打を投稿し、雀士の集合知で解き明かす。初級から上級までステップアップできる麻雀何切るプラットフォーム。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
