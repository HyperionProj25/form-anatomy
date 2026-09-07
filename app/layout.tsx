import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers(),
    host =
      h.get("host") || "form-anatomy-connected.projecthyperion.chatgpt.site";
  const origin = (host.startsWith("localhost") ? "http://" : "https://") + host;
  const title = "Form — Anatomy, connected",
    description =
      "A free interactive 3D anatomy atlas. Explore muscles, bones and the evidence behind myofascial connections. No account required.";
  return {
    title,
    description,
    metadataBase: new URL(origin),
    openGraph: {
      title,
      description,
      images: [
        {
          url: origin + "/og.png",
          width: 1536,
          height: 1024,
          alt: "Form. Understand the body. See the connections.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [origin + "/og.png"],
    },
  };
}
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
