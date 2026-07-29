declare global {
  interface Liveblocks {
    Presence: {
      name: string
      color: string
    }

    Storage: {
      code: string
      language: string
      // whether anyone has actually typed in this room yet — tracked
      // explicitly because comparing against STARTER_CODE breaks the moment
      // the starter text is edited in a later release
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