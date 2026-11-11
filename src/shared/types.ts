/** @deprecated Legacy v0.3 capture taxonomy — kept for migration only */
export const CATEGORIES = ['link', 'doc', 'decision', 'context', 'other'] as const
/** @deprecated Legacy v0.3 ordering — kept for migration only */
export const IMPORTANCE_LEVELS = ['critical', 'high', 'medium', 'low'] as const
/** @deprecated Legacy v0.5 escalation slots — kept for migration only */
export const ESCALATION_SLOTS = [
  'impact',
  'repro',
  'tried',
  'evidence',
  'constraints'
] as const
/** @deprecated Legacy v0.5 */
export const REQUIRED_SLOTS = ['impact', 'repro', 'tried', 'evidence'] as const
/** @deprecated Legacy v0.3–v0.5 section field */
export const ALL_SECTIONS = ['unplaced', ...ESCALATION_SLOTS] as const
/** @deprecated */
export const RECIPIENT_SECTIONS = ESCALATION_SLOTS
/** @deprecated Legacy delivery metadata */
export const DESTINATIONS = ['notion', 'slack', 'google-doc', 'email', 'teams', 'other'] as const
/** @deprecated Legacy v0.5 */
export const URGENCY_LEVELS = ['unspecified', 'sev1', 'sev2', 'sev3', 'sev4'] as const

export type EscalationSlot = (typeof ESCALATION_SLOTS)[number]
export type RequiredSlot = (typeof REQUIRED_SLOTS)[number]
export type RecipientSection = EscalationSlot
export type Section = (typeof ALL_SECTIONS)[number]
export type Category = (typeof CATEGORIES)[number]
export type Importance = (typeof IMPORTANCE_LEVELS)[number]
export type Destination = (typeof DESTINATIONS)[number]
export type Urgency = (typeof URGENCY_LEVELS)[number]

export const SCHEMA_VERSION = 5

export type ShareFormat = 'markdown' | 'plain'

export type ThemeMode = 'light' | 'dark'

export const WORK_OBJECT_TYPES = [
  'capture',
  'task',
  'note',
  'link',
  'person',
  'project',
  'event',
  'stack',
  'brief'
] as const
export type WorkObjectType = (typeof WORK_OBJECT_TYPES)[number]

export const WORK_OBJECT_STATUSES = ['inbox', 'today', 'scheduled', 'done', 'archived'] as const
export type WorkObjectStatus = (typeof WORK_OBJECT_STATUSES)[number]

export interface WorkObjectSource {
  appName?: string
  windowTitle?: string
  url?: string
  capturedText?: string
  iconUrl?: string
}

export interface WorkObject {
  id: string
  type: WorkObjectType
  title: string
  blurb?: string
  body?: string
  source?: WorkObjectSource
  status: WorkObjectStatus
  date?: string
  startTime?: string
  endTime?: string
  relations: string[]
  createdAt: string
  updatedAt: string
}

/** Types editable in Object Detail (Shipment 3). Wider WorkObjectType remains for future. */
export const DETAIL_WORK_OBJECT_TYPES = ['capture', 'task', 'note', 'link'] as const
export type DetailWorkObjectType = (typeof DETAIL_WORK_OBJECT_TYPES)[number]

export interface WorkObjectUpdate {
  title: string
  blurb: string
  body: string
  type: DetailWorkObjectType
  status: 'inbox' | 'today'
  source: {
    appName: string
    windowTitle: string
    url: string
  }
}

export interface CaptureContext {
  appName: string
  windowTitle: string
  url: string
  /** Changes each time the overlay opens. Icon updates reuse the same id. */
  sessionId?: string
  permissionHint?: string
  iconDataUrl?: string
  iconLabel?: string
}

export interface Capture {
  id: string
  title: string
  url: string
  note: string
  createdAt: string
  sourceApp?: string
  iconUrl?: string
  /** @deprecated Legacy field — preserved on disk for migration */
  section?: Section
  /** @deprecated Legacy field — preserved on disk for migration */
  category?: Category
  /** @deprecated Legacy field — preserved on disk for migration */
  importance?: Importance
}

export interface CaptureInput {
  title: string
  url: string
  note: string
  sourceApp?: string
  windowTitle?: string
  iconUrl?: string
}

export interface StackMeta {
  purpose: string
  recipient: string
}

/** Stack — temporary, purpose-bound. Named Canvas in persistence for history. */
export interface Canvas {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  purpose: string
  recipient: string
  captures: Capture[]
}

export interface AppState {
  schemaVersion: number
  canvases: Canvas[]
  activeCanvasId: string | null
  workObjects: WorkObject[]
}

export interface CreateStackInput {
  name: string
  purpose?: string
  recipient?: string
}

/** @deprecated Use CreateStackInput */
export type CreateHandoffInput = CreateStackInput
/** @deprecated Use StackMeta */
export type CanvasMeta = StackMeta

export interface AppAPI {
  getState: () => Promise<AppState>
  getStorePath: () => Promise<string>
  createCanvas: (input: CreateStackInput | string) => Promise<AppState>
  renameCanvas: (id: string, name: string) => Promise<AppState>
  updateCanvasMeta: (id: string, meta: StackMeta) => Promise<AppState>
  deleteCanvas: (id: string) => Promise<AppState>
  setActiveCanvas: (id: string) => Promise<AppState>
  addCapture: (canvasId: string, input: CaptureInput) => Promise<AppState>
  updateCapture: (canvasId: string, captureId: string, input: CaptureInput) => Promise<AppState>
  deleteCapture: (canvasId: string, captureId: string) => Promise<AppState>
  moveCapture: (canvasId: string, captureId: string, direction: 'up' | 'down') => Promise<AppState>
  saveMarkdown: (markdown: string, suggestedName: string) => Promise<boolean>
  copyText: (text: string) => Promise<boolean>
  openCaptureOverlay: () => Promise<void>
  shortcutReady: () => Promise<boolean>
  getCaptureContext: () => Promise<CaptureContext>
  quickCapture: (canvasId: string, input: CaptureInput) => Promise<AppState>
  quickCaptureInbox: (input: CaptureInput) => Promise<AppState>
  quickCaptureToday: (input: CaptureInput) => Promise<AppState>
  updateWorkObject: (id: string, input: WorkObjectUpdate) => Promise<AppState>
  setWorkObjectStatus: (id: string, status: 'inbox' | 'today') => Promise<AppState>
  placeWorkObjectOnStack: (objectId: string, stackId: string) => Promise<AppState>
  deleteWorkObject: (id: string) => Promise<AppState>
  closeCaptureOverlay: () => void
  getTheme: () => Promise<ThemeMode>
  onBackdropImage: (callback: (dataUrl: string) => void) => () => void
  onThemeUpdated: (callback: (theme: ThemeMode) => void) => () => void
  onStateUpdated: (callback: (state: AppState) => void) => () => void
  onCaptureContext: (callback: (context: CaptureContext) => void) => () => void
}
