declare global {
  interface Liveblocks {
    Presence: {
      name: string
      // colour lives in colorForConnection, derived from the connection id
    }

    Storage: {
      code: string
      language: string
      // has anyone typed here yet. A flag, because comparing against
      // STARTER_CODE breaks as soon as the starter text changes
      pristine: boolean
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