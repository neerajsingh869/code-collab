export type Language = 'typescript' | 'javascript' | 'python' | 'css'

export type OutputLine = {
  type: 'log' | 'error'
  text: string
}

export type ChatMessage = {
  id: string
  user: string
  color: string
  text: string
  timestamp: number
}