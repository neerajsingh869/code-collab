"use client";

import { useOthers, useSelf } from "@liveblocks/react";
import { colorForConnection } from "@/lib/constants";

export default function UserPresence() {
  // useSelf = the current user (you)
  // useOthers = everyone else connected to the same room
  const self = useSelf();
  const others = useOthers();

  // Merge into one list — current user first, then others
  const allUsers = [
    ...(self
      ? [
          {
            id: "me",
            name: self.presence.name,
            color: colorForConnection(self.connectionId),
          },
        ]
      : []),
    ...others.map((u) => ({
      id: String(u.connectionId),
      name: u.presence.name,
      color: colorForConnection(u.connectionId),
    })),
  ];

  if (allUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {/* Show max 4 avatars, overlap them with negative margin */}
      <div className="flex">
        {allUsers.slice(0, 4).map((user, i) => (
          <div
            key={user.id}
            title={user.name}
            className="w-6 h-6 rounded-full flex items-center justify-center
                       text-white text-xs font-semibold
                       border-2 border-[#0d1117]
                       -ml-1.5 first:ml-0"
            style={{ background: user.color, zIndex: allUsers.length - i }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>

      {allUsers.length > 4 && (
        <span className="text-gray-600 text-xs">+{allUsers.length - 4}</span>
      )}

      <span className="text-gray-600 text-xs">{allUsers.length} online</span>
    </div>
  );
}
