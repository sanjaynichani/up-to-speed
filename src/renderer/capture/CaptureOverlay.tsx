import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import type { AppState, CaptureContext, CaptureInput } from '@shared/types'
import { readableError } from '@shared/readable-error'
import { isSameCaptureSession, suggestTitle } from '@shared/suggest-title'

const INBOX_DESTINATION = '__inbox__'
const TODAY_DESTINATION = '__today__'

export default function CaptureOverlay() {
  const [state, setState] = useState<AppState | null>(null)
  const [context, setContext] = useState<CaptureContext | null>(null)
  const [destinationId, setDestinationId] = useState(INBOX_DESTINATION)
  const [creatingStack, setCreatingStack] = useState(false)
  const [newStackName, setNewStackName] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [captureTitle, setCaptureTitle] = useState('')
  const [captureUrl, setCaptureUrl] = useState('')
  const [sourceApp, setSourceApp] = useState('')
  const [iconBroken, setIconBroken] = useState(false)
  const sessionRef = useRef<string | undefined>(undefined)
  const savingRef = useRef(false)

  const isInbox = destinationId === INBOX_DESTINATION
  const isToday = destinationId === TODAY_DESTINATION
  const isStack =
    destinationId !== INBOX_DESTINATION &&
    destinationId !== TODAY_DESTINATION &&
    destinationId !== '__new__'
  const selectedStack = isStack
    ? (state?.canvases.find((canvas) => canvas.id === destinationId) ?? null)
    : null

  function applyInitialContext(nextContext: CaptureContext): void {
    setContext(nextContext)
    setError(null)
    setSaving(false)
    setIconBroken(false)
    setDestinationId(INBOX_DESTINATION)
    setCaptureTitle(suggestTitle(nextContext))
    setCaptureUrl(nextContext.url)
    setSourceApp(nextContext.appName)
    setNote('')
    sessionRef.current = nextContext.sessionId
  }

  function acceptContext(nextContext: CaptureContext): void {
    if (!nextContext.sessionId) {
      return
    }
    if (isSameCaptureSession(sessionRef.current, nextContext.sessionId)) {
      mergeContextIcons(nextContext)
      return
    }
    applyInitialContext(nextContext)
  }

  function mergeContextIcons(nextContext: CaptureContext): void {
    setContext((prev) =>
      prev
        ? {
            ...prev,
            iconDataUrl: nextContext.iconDataUrl,
            iconLabel: nextContext.iconLabel
          }
        : nextContext
    )
    setIconBroken(false)
  }

  useEffect(() => {
    void Promise.all([window.api.getState(), window.api.getCaptureContext()])
      .then(([nextState, nextContext]) => {
        setState(nextState)
        acceptContext(nextContext)
      })
      .catch((reason: unknown) => {
        setError(readableError(reason, 'Could not load capture context.'))
      })

    return window.api.onCaptureContext((nextContext) => {
      acceptContext(nextContext)
      void window.api.getState().then(setState)
    })
  }, [])

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.key === 'Escape') {
        window.api.closeCaptureOverlay()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function createStackInline(): Promise<void> {
    const name = newStackName.trim() || 'Untitled stack'
    try {
      const next = await window.api.createCanvas({ name })
      setState(next)
      setDestinationId(next.activeCanvasId ?? INBOX_DESTINATION)
      setCreatingStack(false)
      setNewStackName('')
      setError(null)
    } catch (reason: unknown) {
      setError(readableError(reason, 'Could not create the stack.'))
    }
  }

  async function saveCapture(): Promise<void> {
    if (savingRef.current) {
      return
    }
    if (!captureTitle.trim()) {
      setError('Title is required.')
      return
    }
    if (!note.trim()) {
      setError('Add a takeaway before saving.')
      return
    }
    if (isStack && !selectedStack) {
      setError('Choose a stack first.')
      return
    }

    savingRef.current = true
    setSaving(true)
    setError(null)

    const input: CaptureInput = {
      title: captureTitle.trim(),
      url: captureUrl.trim(),
      note: note.trim(),
      sourceApp: sourceApp || undefined,
      windowTitle: context?.windowTitle || undefined,
      iconUrl: context?.iconDataUrl
    }

    try {
      if (isInbox) {
        await window.api.quickCaptureInbox(input)
        return
      }

      if (isToday) {
        await window.api.quickCaptureToday(input)
        return
      }

      if (selectedStack && destinationId !== state?.activeCanvasId) {
        await window.api.setActiveCanvas(selectedStack.id)
      }
      if (selectedStack) {
        await window.api.quickCapture(selectedStack.id, input)
      }
    } catch (reason: unknown) {
      setError(readableError(reason, 'Could not save capture.'))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    await saveCapture()
  }

  function onNoteKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void saveCapture()
    }
  }

  function submitLabel(): string {
    if (saving) {
      return 'Saving…'
    }
    if (isInbox) {
      return 'Save to Inbox'
    }
    if (isToday) {
      return 'Save to Today'
    }
    return 'Add to stack'
  }

  if (!state || !context) {
    return (
      <div className="overlay-shell">
        <div className="overlay-card loading">Loading capture…</div>
      </div>
    )
  }

  return (
    <div className="overlay-shell">
      <form className="overlay-card" onSubmit={handleSubmit}>
        <header className="overlay-header">
          <div>
            <p className="eyebrow">Quick capture</p>
            <h1>Up to Speed</h1>
          </div>
          <button type="button" className="ghost-button" onClick={() => window.api.closeCaptureOverlay()}>
            Esc
          </button>
        </header>

        {creatingStack ? (
          <label>
            New stack
            <input
              value={newStackName}
              onChange={(event) => setNewStackName(event.target.value)}
              placeholder="Call with Meghan"
              autoFocus
            />
            <div className="overlay-actions">
              <button type="button" onClick={() => setCreatingStack(false)}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={() => void createStackInline()}>
                Create
              </button>
            </div>
          </label>
        ) : (
          <>
            <div className="destination-block">
              <p className="field-label">Save to</p>
              <div className="destination-pills">
                <button
                  type="button"
                  className={`destination-pill ${isInbox ? 'active' : ''}`}
                  onClick={() => setDestinationId(INBOX_DESTINATION)}
                >
                  Inbox
                </button>
                <button
                  type="button"
                  className={`destination-pill ${isToday ? 'active' : ''}`}
                  onClick={() => setDestinationId(TODAY_DESTINATION)}
                >
                  Today
                </button>
              </div>
            </div>

            <label className="stack-picker">
              Or add to stack
              <select
                value={isStack ? destinationId : ''}
                onChange={(event) => {
                  const value = event.target.value
                  if (value === '__new__') {
                    setCreatingStack(true)
                    return
                  }
                  if (!value) {
                    setDestinationId(INBOX_DESTINATION)
                    return
                  }
                  setDestinationId(value)
                }}
              >
                <option value="">Choose a stack…</option>
                {state.canvases.map((canvas) => (
                  <option key={canvas.id} value={canvas.id}>
                    {canvas.name}
                  </option>
                ))}
                <option value="__new__">+ New stack…</option>
              </select>
            </label>
          </>
        )}

        {selectedStack && !creatingStack ? (
          <p className="active-canvas">
            {selectedStack.purpose.trim()
              ? selectedStack.purpose.trim()
              : 'Add a purpose in the main window'}
            {selectedStack.recipient.trim() ? ` · For ${selectedStack.recipient.trim()}` : ''}
          </p>
        ) : null}

        {!creatingStack && (context.appName || context.iconLabel) ? (
          <div className="context-chip">
            <div className="context-icon" aria-hidden="true">
              {context.iconDataUrl && !iconBroken ? (
                <img src={context.iconDataUrl} alt="" onError={() => setIconBroken(true)} />
              ) : (
                <span>{context.iconLabel ?? '?'}</span>
              )}
            </div>
            <div className="context-copy">
              {context.appName ? <span className="context-app">{context.appName}</span> : null}
              {context.windowTitle ? <span className="context-title">{context.windowTitle}</span> : null}
            </div>
          </div>
        ) : null}

        {context.permissionHint && !creatingStack ? (
          <p className="overlay-hint">{context.permissionHint}</p>
        ) : null}

        {!creatingStack ? (
          <>
            <label>
              Title
              <input
                value={captureTitle}
                onChange={(event) => setCaptureTitle(event.target.value)}
                placeholder="What is this?"
              />
            </label>
            <label>
              URL <span className="optional">(optional)</span>
              <input
                value={captureUrl}
                onChange={(event) => setCaptureUrl(event.target.value)}
                placeholder="https://"
              />
            </label>
            <label>
              Takeaway
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={onNoteKeyDown}
                placeholder="What should they know about this?"
                rows={3}
                autoFocus
                required
              />
            </label>
            <p className="overlay-hint enter-hint">Enter to save · Shift+Enter for a new line</p>

            {error ? <p className="overlay-error">{error}</p> : null}

            <div className="overlay-actions">
              <button type="button" onClick={() => window.api.closeCaptureOverlay()}>
                Cancel
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => void saveCapture()}
                disabled={saving || (isStack && !selectedStack)}
              >
                {submitLabel()}
              </button>
            </div>
          </>
        ) : null}
      </form>
    </div>
  )
}
