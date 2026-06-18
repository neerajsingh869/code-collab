"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateRoom = () => {
    if (!name.trim()) {
      setError("Please enter your name to continue");
      return;
    }

    localStorage.setItem("codecollab_username", name.trim());

    // becomes the room's shareable URL — anyone with it joins the same room
    const roomId = nanoid(10);
    setIsLoading(true);
    router.push(`/editor/${roomId}`);
  };

  return (
    <main className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white mb-4">⚡</h1>
          <h2 className="text-2xl font-semibold text-white mb-2">CodeCollab</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Real-time collaborative code editor.
            <br />
            Create a room, share the link, code together.
          </p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-4">
            Enter your name to create a room
          </p>

          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
            placeholder="Your name (e.g. Rahul)"
            maxLength={20}
            className="w-full bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-gray-700 text-sm outline-none transition-colors mb-3"
          />

          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors text-sm"
          >
            {isLoading ? "Creating room..." : "Create Room →"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {[
            "👥 Multiple users, live",
            "⚡ Run code instantly",
            "💬 Built-in live chat",
            "🔗 Share just a URL",
          ].map((item) => (
            <div
              key={item}
              className="text-gray-600 text-xs flex items-center gap-1.5"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
