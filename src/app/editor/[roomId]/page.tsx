"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoomProvider } from "@liveblocks/react";
// ^ In v2 you import directly from @liveblocks/react, not from a config file

import { USER_COLORS, STARTER_CODE } from "@/lib/constants";
import EditorLayout from "@/components/EditorLayout";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [userName, setUserName] = useState("");
  const [userColor, setUserColor] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("codecollab_username");
    if (!savedName) {
      router.push("/");
      return;
    }
    setUserName(savedName);
    setUserColor(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);
    setIsReady(true);
  }, [router]);

  if (!isReady) {
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
    <RoomProvider
      id={roomId}
      initialPresence={{ name: userName, color: userColor }}
      initialStorage={{
        // In v2, plain string/values work directly in initialStorage
        code: STARTER_CODE["typescript"],
        language: "typescript",
      }}
    >
      <EditorLayout />
    </RoomProvider>
  );
}
