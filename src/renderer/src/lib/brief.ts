import type { Canvas, Capture } from '@shared/types'

function sourceLine(capture: Capture): string {
  const bits: string[] = []
  if (capture.title.trim()) {
    bits.push(capture.title.trim())
  }
  if (capture.url.trim()) {
    bits.push(capture.url.trim())
  }
  if (capture.sourceApp?.trim()) {
    bits.push(capture.sourceApp.trim())
  }
  return bits.join(' · ')
}

export function briefToMarkdown(stack: Canvas): string {
  const lines: string[] = [`## ${stack.name}`, '']

  if (stack.purpose.trim()) {
    lines.push(`**Purpose:** ${stack.purpose.trim()}`)
    lines.push('')
  }

  if (stack.recipient.trim()) {
    lines.push(`**For:** ${stack.recipient.trim()}`)
    lines.push('')
  }

  if (stack.captures.length === 0) {
    lines.push('_No captures yet._')
    return `${lines.join('\n')}\n`
  }

  lines.push('### Context')
  lines.push('')

  stack.captures.forEach((capture, index) => {
    const takeaway = capture.note.trim() || capture.title.trim() || 'Untitled capture'
    lines.push(`${index + 1}. ${takeaway}`)
    const source = sourceLine(capture)
    if (source) {
      lines.push(`   Source: ${source}`)
    }
    lines.push('')
  })

  const linked = stack.captures.filter((capture) => capture.url.trim().length > 0)
  if (linked.length > 0) {
    lines.push('### Links')
    lines.push('')
    for (const capture of linked) {
      const label = capture.title.trim() || capture.url.trim()
      lines.push(`- [${label}](${capture.url.trim()})`)
    }
    lines.push('')
  }

  return `${lines.join('\n').trim()}\n`
}

export function briefToPlain(stack: Canvas): string {
  const lines: string[] = [stack.name, '']

  if (stack.purpose.trim()) {
    lines.push(`Purpose: ${stack.purpose.trim()}`)
    lines.push('')
  }

  if (stack.recipient.trim()) {
    lines.push(`For: ${stack.recipient.trim()}`)
    lines.push('')
  }

  if (stack.captures.length === 0) {
    lines.push('No captures yet.')
    return `${lines.join('\n')}\n`
  }

  lines.push('Context')
  stack.captures.forEach((capture, index) => {
    const takeaway = capture.note.trim() || capture.title.trim() || 'Untitled capture'
    lines.push(`${index + 1}. ${takeaway}`)
    const source = sourceLine(capture)
    if (source) {
      lines.push(`   ${source}`)
    }
  })

  const linked = stack.captures.filter((capture) => capture.url.trim().length > 0)
  if (linked.length > 0) {
    lines.push('')
    lines.push('Links')
    for (const capture of linked) {
      lines.push(`- ${capture.title.trim() || capture.url.trim()}: ${capture.url.trim()}`)
    }
  }

  return `${lines.join('\n').trim()}\n`
}

/** @deprecated Use briefToMarkdown */
export function handoffToMarkdown(stack: Canvas): string {
  return briefToMarkdown(stack)
}

export function countCapturesMissingTakeaway(stack: Canvas): number {
  return stack.captures.filter((capture) => !capture.note.trim()).length
}
