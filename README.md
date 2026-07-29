# ⚡ CodeCollab — Real-time Collaborative Code Editor

A collaborative code editor where multiple users edit code simultaneously,
see each other's presence, run code in the browser, and chat — all in real time.

🔗 **Live Demo:** [codecollab.vercel.app](https://code-collab-six-silk.vercel.app)

---

## Features

- **Real-time collaboration** — Type and see changes instantly across all connected users
- **Monaco Editor** — The same engine that powers VS Code, running in the browser
- **Live user presence** — See who's in the room with colored avatars
- **Isolated code execution** — Run JS/TS in a Web Worker, off the main thread
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
of the box.

The significant caveat, stated plainly because it's the current limitation of
this project: `code` is a single Storage value overwritten wholesale on every
edit — last-write-wins, not a character-level merge. This is worse in practice
than "conflicting edits are risky." Because each write replaces the entire
document, an edit anywhere loses concurrent edits everywhere. Two tabs, one
typing on line 1 and one on line 5, reliably ends with one person's work gone
from their own screen. Migrating this to a Yjs CRDT is the next planned change.

**Why a Web Worker for code execution?**
`eval()` runs code with full access to the app, so execution needs to happen
somewhere isolated. This originally used an `<iframe>` loaded from a Blob URL,
on the assumption that a `blob:` origin was a separate origin. That assumption
is wrong: a blob URL **inherits the origin of the document that created it**,
so the iframe was same-origin with the app and user code could reach
`window.parent.document` and `localStorage`. The same mistake broke the
execution timeout — a same-origin iframe shares the main thread, so a blocking
loop froze the page and the timer meant to kill it could never fire.

A Worker fixes both properties. It has no DOM, no `window.parent` and no
`localStorage`, so there is nothing to reach, and it runs on its own thread,
so `terminate()` actually stops a runaway loop after the 5s ceiling. Output
comes back over `postMessage`, handled per-worker rather than through a
window-level listener that accepted messages from any frame. A worker can
still reach the network; closing that is a job for a CSP.

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
    executeCode.ts                 # Web Worker code runner with a hard timeout
    transpileTypeScript.ts         # TS -> JS via Monaco's bundled compiler
    useDebouncedCallback.ts        # Debounce used for the shared-document write
    constants.ts                   # Languages, starter code, user colors
  store/
    useEditorStore.ts              # Zustand — local UI state only
  types/
    index.ts                       # Shared TypeScript types
  liveblocks.config.ts             # Liveblocks global type declarations
```
