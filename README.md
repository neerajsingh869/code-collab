# ⚡ CodeCollab — Real-time Collaborative Code Editor

A collaborative code editor where multiple users edit code simultaneously,
see each other's presence, run code in the browser, and chat — all in real time.

🔗 **Live Demo:** [codecollab.vercel.app](https://code-collab-six-silk.vercel.app)

---

## Features

- **Real-time collaboration** — Type and see changes instantly across all connected users
- **Monaco Editor** — The same engine that powers VS Code, running in the browser
- **Live user presence** — See who's in the room with colored avatars
- **Sandboxed code execution** — Run JS/TS safely using Blob URL iframe isolation
- **Live chat** — Message teammates without leaving the editor
- **Shareable rooms** — Just copy the URL and send it — no signup needed

---

## Tech Stack

| Tool              | Why                                        |
| ----------------- | ------------------------------------------ |
| **Next.js 16**    | App Router, file-based routing, SSR        |
| **TypeScript**    | Type safety across the full codebase       |
| **Monaco Editor** | VS Code editing experience in the browser  |
| **Liveblocks**    | Real-time sync, presence, broadcast events |
| **Zustand**       | Lightweight state management for local UI  |
| **Tailwind CSS**  | Utility-first styling                      |
| **Vercel**        | Zero-config deployment                     |

---

## Architecture Decisions

**Why Liveblocks over raw WebSockets?**
Building WebSocket infrastructure from scratch means handling reconnections,
presence, and broadcast messaging by hand. Liveblocks provides all of that out
of the box. One caveat worth being upfront about: the `code` field here is a
single Storage value overwritten on every edit (last-write-wins), not a
character-level CRDT merge — two people editing the exact same spot at the
same instant can clobber each other. Liveblocks does offer CRDT-backed Yjs
storage for true concurrent text merging; that's a heavier dependency this
project deliberately doesn't pull in yet, in favor of staying simple and
fully explainable.

**Why Blob URL iframe for code execution?**
`eval()` runs code with full access to our app — a serious security risk.
We create a Blob URL and load it in an `<iframe>` — this gives the iframe
a completely separate `blob:` origin, so it cannot access our app's DOM,
localStorage, or variables. Output is passed back safely via `postMessage`.
We also call `URL.revokeObjectURL()` after execution to free memory.

**Why Zustand for some state, Liveblocks for other?**
Liveblocks handles _shared_ state (code content, language) that all users need.
Zustand handles _local_ UI state (panels, output lines, chat messages) that only
the current user cares about. Mixing them would unnecessarily sync UI preferences
across users and cause unintended re-renders.

**Why is chat ephemeral (cleared on refresh)?**
Chat uses Liveblocks broadcast events which are fire-and-forget — they reach all
live users instantly but aren't persisted. This is intentional: a code session's
chat doesn't need history. If persistence were needed, Liveblocks Storage or a
database would be the right addition.

---

## Local Setup

```bash
# 1. Clone and install
git clone https://github.com/your-username/code-collab
cd code-collab
npm install

# 2. Get a free Liveblocks API key at liveblocks.io
# 3. Add to .env.local
echo "NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_your_key" > .env.local

# 4. Run
npm run dev
```

Open [localhost:3000](http://localhost:3000), enter your name, create a room.
Open a second tab with the same URL — you're now collaborating in real time.

---

## Project Structure

```
src/
  app/
    page.tsx                       # Homepage — enter name, create room
    layout.tsx                     # Root layout with LiveblocksProvider
    provider.tsx                   # LiveblocksProvider client component
    editor/[roomId]/page.tsx       # Dynamic route — each room is a URL
  components/
    EditorLayout.tsx               # Main layout — header + all panels
    CollaborativeEditor.tsx        # Monaco Editor + Liveblocks sync
    ChatPanel.tsx                  # Real-time chat via broadcast events
    OutputPanel.tsx                # Code execution output display
    UserPresence.tsx               # Online user avatars
    ErrorBoundary.tsx              # Graceful error handling
  lib/
    executeCode.ts                 # Blob URL iframe sandboxed code runner
    constants.ts                   # Languages, starter code, user colors
  store/
    useEditorStore.ts              # Zustand — local UI state only
  types/
    index.ts                       # Shared TypeScript types
  liveblocks.config.ts             # Liveblocks global type declarations
```
