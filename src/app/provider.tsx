"use client";

import { LiveblocksProvider } from "@liveblocks/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Not publicApiKey: that key is readable by anyone who opens the bundle and
  // works from any origin. The route behind this mints a session scoped to the
  // one room being joined.
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      {children}
    </LiveblocksProvider>
  );
}
