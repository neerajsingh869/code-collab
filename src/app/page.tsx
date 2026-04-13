import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold text-white">⚡ CodeCollab</h1>
      <p className="text-gray-400 text-lg text-center max-w-md">
        Real-time collaborative code editor. Create a room, share the link, code
        together.
      </p>

      {/* Link is Next.js's version of <a> — does client-side navigation */}
      <Link
        href="/editor"
        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-medium transition-colors"
      >
        Create a Room →
      </Link>
    </main>
  );
}
