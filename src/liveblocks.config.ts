// This tells TypeScript the shape of our shared room data
// Without this, useStorage and useMutation return 'unknown' types

declare global {
  interface Liveblocks {
    // Presence = real-time info about one user, visible to everyone
    // Changes fast: name, color shown on their cursor
    Presence: {
      name: string
      color: string
    }

    // Storage = shared persistent data for the whole room
    // When one user changes this, ALL users see it instantly
    Storage: {
      code: string
      language: string
    }

    // RoomEvent = one-time broadcast messages (used for chat)
    // Fire-and-forget — not saved permanently like Storage
    RoomEvent:
      | {
          type: 'CHAT_MESSAGE'
          id: string
          user: string
          color: string
          text: string
          timestamp: number
        }
  }
}

// This empty export makes TypeScript treat this as a module
// Required for global augmentation to work correctly
export {}