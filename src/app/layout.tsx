import type { Metadata } from "next";
import "./globals.css";

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
        {/* LiveblocksProvider deliberately isn't here: nothing outside a room
            uses it, and in the root layout it put the realtime client and Yjs
            in the bundle for the landing page too */}
        {children}
      </body>
    </html>
  );
}
