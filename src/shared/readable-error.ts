/** Electron wraps a main-process error as "Error invoking remote method…". Show the sentence instead. */
export function readableError(reason: unknown, fallback: string): string {
  const message = reason instanceof Error ? reason.message.trim() : ''
  const wrapped = message.match(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?([\s\S]+)$/)
  const text = (wrapped?.[1] ?? message).trim()
  return text || fallback
}
