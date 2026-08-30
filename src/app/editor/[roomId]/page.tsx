"use client";

import { useEffect, useState } from "react";
import { preconnect } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { RoomProvider } from "@liveblocks/react";
import EditorLayout from "@/components/EditorLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import Providers from "@/app/provider";

// @monaco-editor/loader fetches the editor from here, but only once this
// route's JS has run. Opening the connection during HTML parse takes the
// handshake off the critical path.
const MONACO_CDN = "https://cdn.jsdelivr.net";

export default function EditorPage() {
  preconnect(MONACO_CDN);

  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [userName, setUserName] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("codecollab_username");

    // direct link, no saved name — send them to enter one first
    if (!savedName) {
      router.push("/");
      return;
    }

    // localStorage isn't available during SSR, so this has to wait until
    // after mount — that's a legitimate use of an effect, not a workaround.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserName(savedName);
  }, [router]);

  if (!userName) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div role="status" className="flex flex-col items-center gap-3">
          <div
            aria-hidden="true"
            className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full motion-safe:animate-spin"
          />
          <span className="text-gray-400 text-sm">Connecting to room...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Providers>
        <RoomProvider
          id={roomId}
          initialPresence={{ name: userName, cursor: null }}
          initialStorage={{
            language: "typescript",
            pristine: true,
          }}
        >
          <EditorLayout roomId={roomId} userName={userName} />
        </RoomProvider>
      </Providers>
    </ErrorBoundary>
  );
}
