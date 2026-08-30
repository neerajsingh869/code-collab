# CodeCollab

A collaborative code editor. Open a room, send someone the URL, and you are both
editing the same file — with each other's cursors visible — and can run the code
in the browser without either of you signing up for anything.

Live: https://code-collab-six-silk.vercel.app

Next.js 16 (App Router) · React 19 · TypeScript · Monaco · Yjs over Liveblocks ·
Zustand · Tailwind v4 · Vitest

## What is interesting in here

Most of the app is glue. Three parts are not, and they are the parts I would
want to be asked about.

### The editor binding is written by hand

`src/lib/monacoYjsBinding.ts` joins a Monaco text model to a `Y.Text`. There is
an off-the-shelf package for this — `y-monaco` — and using it would have left me
with a collaborative editor I could not explain, which defeats the point.

Two directions have to be kept from feeding each other. Applying a remote delta
makes Monaco fire a change event, and writing that straight back into the
document loops; so remote application is wrapped in a guard, and every
transaction this binding opens is tagged with a private origin symbol its own
observer then ignores. Going the other way, Monaco hands you the changes for one
edit ordered from the end of the document backwards, which means each change's
offset is still valid after the ones already applied — so they can be replayed
into Yjs in order without recomputing anything.

It is tested against a fake text model rather than a real editor, because Monaco
needs a layout engine and jsdom has none. The fake implements offset/position
mapping, `applyEdits` and the change event, and nothing else — including that
end-to-start ordering guarantee, which is the property the binding actually
depends on. On top of the specific cases there is a 200-round randomised test
that has two replicas edit concurrently at random offsets and asserts they land
on the same text, and that neither editor buffer has drifted from the document
driving it.

This replaced a version where the whole file was one Liveblocks Storage value
overwritten on every keystroke. That is not "conflicting edits are risky" — every
write replaced the entire document, so an edit anywhere dropped concurrent edits
everywhere. Two tabs, one typing on line 1 and one on line 5, reliably ended with
one person's work gone from their own screen. The randomised test above is the
regression guard for exactly that.

### Cursors are relative positions, not offsets

A caret sent to other people as a character offset is already wrong when it
arrives: anyone inserting text above it moves the code without moving the
number. `src/lib/cursorAnchor.ts` encodes a caret as a Yjs relative position,
which anchors to the character itself and survives edits made anywhere else.
They go out over Liveblocks presence, encoded as bytes rather than through
`relativePositionToJSON`, whose shape Yjs types as `any` — presence has to be
strictly typed JSON.

The offsets are turned into anchors at the moment of the cursor event and only
then handed to a throttle (`src/lib/useThrottledCallback.ts`), because an offset
is only true when it is taken while a relative position stays true however long
the send waits. Throttle rather than debounce, which is the opposite choice to
the document write next door: a debounce waits for you to stop, and a dragged
selection must keep moving on the other screen while it is happening.

Rendering is in `src/lib/remoteCursors.ts`. Carets and selections are Monaco
decorations; names are content widgets, not decoration-injected text, because
injected text is laid out inline and a label appearing next to someone's caret
would shove the code on that line sideways while you were reading it. The whole
thing subscribes to the Liveblocks room directly rather than through
`useOthers`, so a cursor moving on someone else's machine redraws in Monaco
without re-rendering the React tree the editor sits in.

### The code runner used to be a sandbox that wasn't one

Running user code started out in an `<iframe>` loaded from a Blob URL, on the
assumption that `blob:` is its own origin. It is not — a blob URL inherits the
origin of the document that created it, so the iframe was same-origin with the
app and code typed into the editor could read `window.parent.document` and
`localStorage`. I found this by running a probe in the editor and reading the
app's own DOM back out of it.

The same fact broke the timeout. A same-origin iframe shares the main thread, so
a blocking loop froze the page along with the timer meant to kill it; an 8-second
busy loop ran to completion.

It is a Web Worker now (`src/lib/executeCode.ts`). No DOM, no `window.parent`, no
`localStorage`, its own thread — so `terminate()` genuinely stops a runaway loop
at the 5s ceiling, and messages are handled per-worker instead of through a
window listener that accepted anything from any frame. A worker can still reach
the network; closing that needs a CSP and is not done.

Knowing when a run has *finished* is its own problem, since the last statement
returning does not mean the work is over. `src/lib/executionRuntime.ts` wraps
`setTimeout`/`setInterval`/`fetch` and counts what is outstanding. Microtasks are
deliberately not counted: they drain before the next macrotask, so scheduling the
completion check as a macrotask lets a whole promise chain settle first. Known
gaps, stated rather than hidden: `XMLHttpRequest`, `WebSocket`, `MessageChannel`
and IndexedDB are untracked, and the 5s ceiling still kills legitimately slow
work. It is tested by running the real harness inside a `node:vm` context, where
the global and `self` are the same object — the property that makes reassigning
`self.setTimeout` rebind the bare `setTimeout`. jsdom has no Worker, and a
hand-written mock would only have tested the mock.

## Accessibility

Audited with axe-core driven in a real Chrome against the production build, both
routes, panels open and populated. Six violation types on the editor route, two
of them critical, now zero.

axe found the mechanical half: an unnamed language `<select>` and chat close
button, and contrast — `text-gray-700/600/500` on `#0d1117` measures 1.67:1
against a required 4.5, and white initials on the presence colours measured
2.53:1, so avatar and badge text is now `#0d1117` at worst 7.45:1.

It could not find the half that mattered more. Nothing on the page was ever
announced, so output and chat are `role="log" aria-live="polite"`. Focus was
never returned when a panel closed, dropping keyboard users on `<body>`;
`useReturnFocusOnClose` hands it back to the trigger. Disabled Run was a `<div>`
whose only explanation lived in a `title` attribute that needs a hover — it is a
real button with `aria-disabled` now, because `disabled` would drop it out of the
tab order and take the explanation with it. And the home page's `<h1>` contained
one character, `⚡`, so the site's top-level heading announced as "high voltage".

Remote carets are decoration, invisible to a screen reader, so the "X is here"
badges stay as the perceivable version of the same information.

The suite runs in CI. `src/test/contrast.test.ts` exists because jsdom loads no
stylesheet, which makes axe silently disable its own `color-contrast` rule there
and pass — contrast is enforced instead by scanning source for greys dimmer than
`gray-400` and computing WCAG ratios over the palette directly. That scan caught
a file the manual browser audit had missed, because its fallback UI never
rendered. What is still not covered, since jsdom has neither layout nor CSS: real
rendered contrast, focus order, and visible focus rings.

## Performance

Measured with Lighthouse against the production build, mobile preset, throttled.
The landing page went from 98 to 99, and the numbers underneath moved more than
the score does:

| | before | after |
|---|---|---|
| Largest Contentful Paint | 2.5 s | 2.1 s |
| Speed Index | 1.0 s | 0.8 s |
| Unused JavaScript | 108 KiB | 50 KiB |
| Page weight | 246 KiB | 181 KiB |
| Cumulative Layout Shift | 0 | 0 |

Almost all of that is one mistake. `LiveblocksProvider` was in the root layout,
which is the obvious place to put a provider and the wrong one here: nothing
outside a room uses it, so every visitor to the landing page — a form with one
input — downloaded the realtime client and Yjs with it. That was a 66 KiB chunk
measuring 89.6% unused. It moved into the editor route, where it belongs.

Monaco is already lazily loaded through `next/dynamic` and fetched from a CDN at
runtime rather than bundled, which is why the editor route's own JavaScript is
~133 KiB despite shipping a full code editor. The editor route now issues a
`preconnect` to that CDN during render, so the TLS handshake is not waiting on
this route's JavaScript to execute first — a standard win, but I have not
measured it, so I am not claiming a number.

Two things I looked at and left alone: 13 KiB of polyfills for `Array.prototype.at`
and friends live inside Next's own precompiled React chunk, so a `browserslist`
target does not remove them; and the 26 KiB favicon is real weight but not on the
critical path.

Interaction latency is unmeasured. Total Blocking Time is 40–50 ms, which is the
lab proxy for it, but a real INP number needs field data.

## Auth, and what it does and does not fix

The browser holds no Liveblocks key. `src/app/api/liveblocks-auth/route.ts` mints
a session server-side, scoped to the single room being joined, against a secret
that never reaches the client. Identity is an anonymous id in an httpOnly cookie,
so the same person reconnecting is the same session.

What that fixes: the public key it replaced shipped inside the client bundle, so
anyone who opened devtools could point their own application at this project and
spend its quota.

What it does not fix: the endpoint will still authorize anybody for any room they
ask for. Room-level access control needs a record of who is allowed where, which
needs a database, which this does not have yet. Room ids are `nanoid(10)`, so
rooms are unguessable in practice but not actually private.

## State, and which state lives where

Three stores, on purpose.

- **Yjs** — the document. Concurrent edits have to converge, which is the one
  thing only a CRDT does.
- **Liveblocks Storage** — the scalars around it (`language`, and a `pristine`
  flag for whether anyone has typed yet). Last write wins, which for a dropdown
  is the behaviour you actually want.
- **Zustand** — local UI only: panels, output lines, chat. Syncing these would
  push one person's panel layout onto everyone.

Presence carries name and cursor. Colour is not in presence — it is
`colorForConnection(connectionId)`, derived, because anything every client can
compute identically should not be state. Chat is fire-and-forget broadcast, so it
does not survive a refresh; its listener lives above the panel rather than inside
it, since the panel unmounts when closed and used to miss everything sent while
it was.

## Running it

```bash
npm install
cp .env.example .env
# add your secret key from liveblocks.io -> your project -> API Keys
npm run dev
```

`LIVEBLOCKS_SECRET_KEY` is the only variable, and it is server-side. Open
localhost:3000, enter a name, create a room, then open the URL in a second window
to see the other half.

```bash
npm test          # unit + axe
npm run test:a11y # just the accessibility suite
npm run lint
npm run build
```

CI runs lint, build and the full test suite on every push and pull request.

## Layout

```
src/
  app/
    page.tsx                        enter a name, create a room
    editor/[roomId]/page.tsx        one route per room
    api/liveblocks-auth/route.ts    server-side session minting
  components/
    EditorLayout.tsx                header, panels, run
    CollaborativeEditor.tsx         Monaco, bound to the document
    ChatPanel.tsx  OutputPanel.tsx  UserPresence.tsx  ErrorBoundary.tsx
  lib/
    monacoYjsBinding.ts             Monaco <-> Y.Text, both directions
    monacoOffsets.ts                the line/column <-> offset boundary
    cursorAnchor.ts                 carets as Yjs relative positions
    remoteCursors.ts                decorations and name widgets
    useCursorPresence.ts            publish mine, draw everyone else's
    executeCode.ts                  Worker runner with a hard timeout
    executionRuntime.ts             async completion tracking
    transpileTypeScript.ts          TS -> JS via Monaco's own compiler
    useDebouncedCallback.ts  useThrottledCallback.ts
    usePrefersReducedMotion.ts  useReturnFocusOnClose.ts
  store/useEditorStore.ts           local UI state
  test/                             axe helpers, shared fake text model
```

## Not done

- No database of my own. Liveblocks holds the document, so reopening a room URL
  does bring the code back — but there are no accounts, no list of the rooms you
  have been in, no version history, and no snapshot I control. Chat really is
  ephemeral. That is the next thing.
- Python and CSS are in the language dropdown but only JS and TS run. Python is
  meant to be Pyodide.
- No CSP, so a worker can still make network calls.
- No end-to-end test. Convergence is covered by the randomised binding test, but
  nothing drives two real browsers against a real room.
