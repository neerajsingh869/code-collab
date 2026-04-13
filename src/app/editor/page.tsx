"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-500">
      Loading editor...
    </div>
  ),
});

const LANGUAGES = [
  { id: "typescript", label: "TypeScript", color: "#3178c6" },
  { id: "javascript", label: "JavaScript", color: "#f7df1e" },
  { id: "python", label: "Python", color: "#3572A5" },
  { id: "css", label: "CSS", color: "#563d7c" },
];

const STARTER_CODE: Record<string, string> = {
  typescript: `// Welcome to CodeCollab ⚡
// Start typing — your teammates will see it in real time

interface User {
  name: string
  targetSalary: number
}

const getWealthy = (user: User): string => {
  const months = Math.ceil(400000 / user.targetSalary)
  return \`\${user.name} will hit ₹4L/month in \${months} months\`
}

console.log(getWealthy({ name: 'You', targetSalary: 150000 }))
`,
  javascript: `// JavaScript starter
function greet(name) {
  return \`Hello, \${name}!\`
}

console.log(greet('World'))
`,
  python: `# Python starter
def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("World"))
`,
  css: `/* CSS starter */
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
`,
};

export default function EditorPage() {
  const [language, setLanguage] = useState("typescript");

  // Stores the actual code content in the editor
  const [code, setCode] = useState(STARTER_CODE["typescript"]);

  // Called every time the user types anything in the editor
  // value is the full current content of the editor
  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  // Called when user clicks a different language
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(STARTER_CODE[lang]); // reset code to the starter for that language
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d1117]">
      {/* TOP BAR */}
      <header className="h-11 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4 flex-shrink-0">
        <span className="text-blue-400 font-semibold text-sm">
          ⚡ CodeCollab
        </span>

        {/* Language selector in the top bar */}
        <div className="flex gap-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleLanguageChange(lang.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                language === lang.id
                  ? "bg-[#21262d] text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-gray-500 text-xs">1 user online</span>
        </div>
      </header>

      {/* EDITOR — takes up all remaining space */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark" // GitHub dark theme
          options={{
            fontSize: 14,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            renderLineHighlight: "all",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            tabSize: 2,
          }}
        />
      </div>

      {/* BOTTOM STATUS BAR */}
      <div className="h-6 bg-[#161b22] border-t border-[#30363d] flex items-center px-4 gap-6 flex-shrink-0">
        <span className="text-[10px] text-gray-500">
          {LANGUAGES.find((l) => l.id === language)?.label}
        </span>
        <span className="text-[10px] text-gray-500">
          {code.split("\n").length} lines
        </span>
        <span className="text-[10px] text-gray-500">
          {code.length} characters
        </span>
      </div>
    </div>
  );
}
