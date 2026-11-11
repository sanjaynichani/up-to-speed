import { copyFileSync, existsSync } from 'fs'
import type { Capture, WorkObject, WorkObjectSource, WorkObjectStatus, WorkObjectType } from '@shared/types'
import {
  SCHEMA_VERSION,
  WORK_OBJECT_STATUSES,
  WORK_OBJECT_TYPES
} from '@shared/types'

export function backupStoreFile(filePath: string, targetVersion = SCHEMA_VERSION): void {
  const backupPath = `${filePath}.pre-v${targetVersion}-backup`
  if (existsSync(filePath) && !existsSync(backupPath)) {
    copyFileSync(filePath, backupPath)
  }
}

export function normalizeCapture(raw: Partial<Capture> & Record<string, unknown>): Capture {
  const title = typeof raw.title === 'string' ? raw.title : 'Untitled capture'
  const url = typeof raw.url === 'string' ? raw.url : ''
  const note = typeof raw.note === 'string' ? raw.note : ''
  const createdAt =
    typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()

  const capture: Capture = {
    id: typeof raw.id === 'string' ? raw.id : '',
    title,
    url,
    note,
    createdAt,
    sourceApp: typeof raw.sourceApp === 'string' ? raw.sourceApp : undefined
  }

  if (typeof raw.section === 'string') {
    capture.section = raw.section as Capture['section']
  }
  if (raw.category) {
    capture.category = raw.category as Capture['category']
  }
  if (raw.importance) {
    capture.importance = raw.importance as Capture['importance']
  }

  return capture
}

function isWorkObjectType(value: unknown): value is WorkObjectType {
  return typeof value === 'string' && (WORK_OBJECT_TYPES as readonly string[]).includes(value)
}

function isWorkObjectStatus(value: unknown): value is WorkObjectStatus {
  return typeof value === 'string' && (WORK_OBJECT_STATUSES as readonly string[]).includes(value)
}

function normalizeSource(raw: unknown): WorkObjectSource | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }

  const source = raw as Record<string, unknown>
  const next: WorkObjectSource = {}

  if (typeof source.appName === 'string' && source.appName.trim()) {
    next.appName = source.appName
  }
  if (typeof source.windowTitle === 'string' && source.windowTitle.trim()) {
    next.windowTitle = source.windowTitle
  }
  if (typeof source.url === 'string' && source.url.trim()) {
    next.url = source.url
  }
  if (typeof source.capturedText === 'string' && source.capturedText.trim()) {
    next.capturedText = source.capturedText
  }

  return Object.keys(next).length > 0 ? next : undefined
}

export function normalizeWorkObject(raw: Partial<WorkObject> & Record<string, unknown>): WorkObject {
  const createdAt =
    typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()

  const object: WorkObject = {
    id: typeof raw.id === 'string' ? raw.id : '',
    type: isWorkObjectType(raw.type) ? raw.type : 'capture',
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'Untitled capture',
    status: isWorkObjectStatus(raw.status) ? raw.status : 'inbox',
    relations: Array.isArray(raw.relations)
      ? raw.relations.filter((id): id is string => typeof id === 'string')
      : [],
    createdAt,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt
  }

  if (typeof raw.blurb === 'string') {
    object.blurb = raw.blurb
  }
  if (typeof raw.body === 'string') {
    object.body = raw.body
  }
  if (typeof raw.date === 'string') {
    object.date = raw.date
  }
  if (typeof raw.startTime === 'string') {
    object.startTime = raw.startTime
  }
  if (typeof raw.endTime === 'string') {
    object.endTime = raw.endTime
  }

  const source = normalizeSource(raw.source)
  if (source) {
    object.source = source
  }

  return object
}

export function readPurpose(raw: Record<string, unknown>): string {
  if (typeof raw.purpose === 'string') {
    return raw.purpose
  }
  if (typeof raw.outcome === 'string') {
    return raw.outcome
  }
  return ''
}

export function readRecipient(raw: Record<string, unknown>): string {
  if (typeof raw.recipient === 'string') {
    return raw.recipient
  }
  if (typeof raw.audience === 'string') {
    return raw.audience
  }
  return ''
}

export { SCHEMA_VERSION }
