"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoomProvider } from "@liveblocks/react";
import { USER_COLORS, STARTER_CODE } from "@/lib/constants";
import EditorLayout from "@/components/EditorLayout";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [userName, setUserName] = useState("");
  const [userColor, setUserColor] = useState("");

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
    setUserColor(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);
  }, [router]);

  if (!userName) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 text-sm">Connecting to room...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <RoomProvider
        id={roomId}
        initialPresence={{ name: userName, color: userColor }}
        initialStorage={{
          code: STARTER_CODE["typescript"],
          language: "typescript",
        }}
      >
        <EditorLayout
          roomId={roomId}
          userName={userName}
          userColor={userColor}
        />
      </RoomProvider>
    </ErrorBoundary>
  );
}
