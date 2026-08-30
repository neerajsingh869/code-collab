"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { markCreatedHere } from "@/lib/roomCreator";

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
    // marks this tab as the one that seeds the starter snippet
    markCreatedHere(roomId);
    setIsLoading(true);
    router.push(`/editor/${roomId}`);
  };

  return (
    <main className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p aria-hidden="true" className="text-5xl mb-4">
            ⚡
          </p>
          <h1 className="text-2xl font-semibold text-white mb-2">CodeCollab</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Real-time collaborative code editor.
            <br />
            Create a room, share the link, code together.
          </p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
          <label htmlFor="user-name" className="block text-gray-300 text-sm mb-4">
            Enter your name to create a room
          </label>

          <input
            id="user-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
            placeholder="Your name (e.g. Rahul)"
            maxLength={20}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "user-name-error" : undefined}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-gray-400 text-sm outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors mb-3"
          />

          {error && (
            <p id="user-name-error" role="alert" className="text-red-400 text-xs mb-3">
              {error}
            </p>
          )}

          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors text-sm"
          >
            {isLoading ? "Creating room..." : "Create Room →"}
          </button>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-2">
          {[
            { icon: "👥", label: "Multiple users, live" },
            { icon: "⚡", label: "Run code instantly" },
            { icon: "💬", label: "Built-in live chat" },
            { icon: "🔗", label: "Share just a URL" },
          ].map(({ icon, label }) => (
            <li
              key={label}
              className="text-gray-400 text-xs flex items-center gap-1.5"
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
