import type { Metadata } from "next";
import "./globals.css";
import Providers from "./provider";

export const metadata: Metadata = {
  title: "CodeCollab — Real-time Collaborative Editor",
  description: "Create a room, share the link, code together in real time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Providers wraps everything so Liveblocks hooks work anywhere in the tree */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
