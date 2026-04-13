import type { Metadata } from 'next'
import './globals.css'

// Metadata is a Next.js feature — it sets the <title> and description
// that Google and browser tabs show. No more helmet library needed.
export const metadata: Metadata = {
  title: 'CodeCollab — Real-time Collaborative Editor',
  description: 'Code together, in real time',
}

export default function RootLayout({
  children, // children = whatever page is currently being shown
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}