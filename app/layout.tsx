import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  variable: "--font-editor",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host =
    incoming.get("x-forwarded-host") || incoming.get("host") || "localhost:3000";
  const protocol =
    incoming.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", base).toString();

  return {
    metadataBase: base,
    title: "字花模型编辑器｜在线生成彩色 3MF",
    description:
      "在线编辑中文文字、Logo、星星、火苗、电脑和可爱图案，并导出可用于 Bambu Studio 的四色闭合 3MF。",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "字花模型编辑器",
      description: "把文字和自定义图案组合成可打印的四色 3MF。",
      type: "website",
      images: [{ url: socialImage, width: 1731, height: 909 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "字花模型编辑器",
      description: "把文字和自定义图案组合成可打印的四色 3MF。",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={notoSans.className}>{children}</body>
    </html>
  );
}
