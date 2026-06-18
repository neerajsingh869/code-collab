declare global {
  interface Liveblocks {
    Presence: {
      name: string
      color: string
    }

    Storage: {
      code: string
      language: string
    }

    // fire-and-forget — not persisted, so chat history doesn't survive a refresh
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

// augments the global Liveblocks type — required by @liveblocks/react
export {}