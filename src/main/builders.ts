import { randomUUID } from 'crypto'
import type { Capture, CaptureInput, WorkObject, WorkObjectSource, WorkObjectUpdate } from '@shared/types'

function now(): string {
  return new Date().toISOString()
}

export function assertCaptureInput(input: CaptureInput): void {
  if (!input.title?.trim()) {
    throw new Error('Title is required.')
  }
  if (!input.note?.trim()) {
    throw new Error('Add a takeaway before saving.')
  }
}

function takeawayFromWorkObject(object: WorkObject): string {
  const blurb = object.blurb?.trim() ?? ''
  const body = object.body?.trim() ?? ''
  if (blurb && body && blurb !== body) {
    return `${blurb}\n\n${body}`
  }
  return blurb || body
}

export function buildCapture(input: CaptureInput): Capture {
  return {
    id: randomUUID(),
    title: input.title.trim() || 'Untitled capture',
    url: input.url.trim(),
    note: input.note.trim(),
    createdAt: now(),
    sourceApp: input.sourceApp?.trim() || undefined,
    iconUrl: input.iconUrl?.trim() || undefined
  }
}

export function captureFromWorkObject(object: WorkObject): Capture {
  return {
    id: randomUUID(),
    title: object.title.trim() || 'Untitled capture',
    url: object.source?.url?.trim() ?? '',
    note: takeawayFromWorkObject(object),
    createdAt: object.createdAt,
    sourceApp: object.source?.appName?.trim() || undefined,
    iconUrl: object.source?.iconUrl?.trim() || undefined
  }
}

export function buildWorkObjectFromCaptureInput(
  input: CaptureInput,
  status: 'inbox' | 'today' = 'inbox'
): WorkObject {
  const createdAt = now()
  const appName = input.sourceApp?.trim()
  const windowTitle = input.windowTitle?.trim()
  const url = input.url.trim()
  const source: WorkObjectSource = {
    ...(appName ? { appName } : {}),
    ...(windowTitle ? { windowTitle } : {}),
    ...(url ? { url } : {}),
    ...(input.iconUrl?.trim() ? { iconUrl: input.iconUrl.trim() } : {})
  }

  return {
    id: randomUUID(),
    type: 'capture',
    title: input.title.trim() || 'Untitled capture',
    blurb: input.note.trim(),
    source,
    status,
    relations: [],
    createdAt,
    updatedAt: createdAt
  }
}

const DETAIL_TYPES = ['capture', 'task', 'note', 'link'] as const

/** Keeps the source icon when the URL did not change. Editing used to drop it. */
export function applyWorkObjectUpdate(object: WorkObject, input: WorkObjectUpdate, updatedAt: string): void {
  if (!(DETAIL_TYPES as readonly string[]).includes(input.type)) {
    throw new Error('Unsupported object type.')
  }
  if (input.status !== 'inbox' && input.status !== 'today') {
    throw new Error('Unsupported status.')
  }
  if (!input.blurb.trim() && !input.body.trim()) {
    throw new Error('Add a takeaway before saving.')
  }

  object.title = input.title.trim() || object.title
  object.blurb = input.blurb.trim()
  object.body = input.body.trim()
  object.type = input.type
  object.status = input.status

  const appName = input.source.appName.trim()
  const windowTitle = input.source.windowTitle.trim()
  const url = input.source.url.trim()
  const previousUrl = object.source?.url ?? ''
  const previousIcon = object.source?.iconUrl
  const source: WorkObjectSource = {
    ...(appName ? { appName } : {}),
    ...(windowTitle ? { windowTitle } : {}),
    ...(url ? { url } : {}),
    ...(url === previousUrl && previousIcon ? { iconUrl: previousIcon } : {})
  }
  object.source = Object.keys(source).length > 0 ? source : undefined
  object.updatedAt = updatedAt
}
