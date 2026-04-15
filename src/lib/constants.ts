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
  typescript: `// Welcome to CodeCollab ⚡
// Everyone in this room sees your changes in real time

interface User {
  name: string
  targetSalary: number
}

const getWealthy = (user: User): string => {
  return \`\${user.name} is on the way to ₹4L/month!\`
}

console.log(getWealthy({ name: 'You', targetSalary: 400000 }))
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

// Each user in the room gets one of these colors for their avatar + cursor label
export const USER_COLORS = [
  "#58a6ff",
  "#f78166",
  "#3fb950",
  "#d2a8ff",
  "#ffa657",
  "#79c0ff",
];
