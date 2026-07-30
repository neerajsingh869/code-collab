import type { Language } from "@/types";

// The language options shown in the header dropdown
export const LANGUAGES: { id: Language; label: string }[] = [
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "css", label: "CSS" },
];

// Default code shown when a room is first created
export const STARTER_CODE: Record<Language, string> = {
  typescript: `// Welcome to CodeCollab
// Share this URL and everyone sees your changes as you type

interface Task {
  id: number
  title: string
  done: boolean
}

const tasks: Task[] = [
  { id: 1, title: 'Open a room', done: true },
  { id: 2, title: 'Send someone the link', done: false },
  { id: 3, title: 'Edit this file together', done: false },
]

const remaining = tasks.filter((task) => !task.done)

console.log(\`\${remaining.length} left:\`, remaining.map((task) => task.title))
`,
  javascript: `// JavaScript starter
function greet(name) {
  return \`Hello, \${name}! Let's build.\`
}

console.log(greet('World'))
`,
  python: `# Python starter
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
`,
  css: `/* CSS starter */
.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  min-height: 100vh;
  color: white;
}
`,
};

const USER_COLORS = [
  "#58a6ff",
  "#f78166",
  "#3fb950",
  "#d2a8ff",
  "#ffa657",
  "#79c0ff",
];

// Derived from the connection id instead of kept in presence, so every client
// works out the same colour without it being synced. Distinct for up to six
// people; after enough joins and leaves two live ids can land on the same one.
export const colorForConnection = (connectionId: number) =>
  USER_COLORS[connectionId % USER_COLORS.length];
