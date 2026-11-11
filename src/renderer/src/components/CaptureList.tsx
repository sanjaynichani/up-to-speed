import { useMemo, useState } from 'react'
import type { Canvas, Capture, CaptureInput } from '@shared/types'
import SourceIcon from './SourceIcon'

interface CaptureListProps {
  stack: Canvas
  onUpdateCapture: (captureId: string, input: CaptureInput) => Promise<string | null>
  onDeleteCapture: (captureId: string) => Promise<void>
  onMoveCapture: (captureId: string, direction: 'up' | 'down') => Promise<void>
}

function CaptureItem({
  capture,
  index,
  total,
  onUpdateCapture,
  onDeleteCapture,
  onMoveCapture
}: {
  capture: Capture
  index: number
  total: number
  onUpdateCapture: (captureId: string, input: CaptureInput) => Promise<string | null>
  onDeleteCapture: (captureId: string) => Promise<void>
  onMoveCapture: (captureId: string, direction: 'up' | 'down') => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [note, setNote] = useState(capture.note)
  const [title, setTitle] = useState(capture.title)

  function beginEdit(): void {
    setTitle(capture.title)
    setNote(capture.note)
    setSaveError(null)
    setConfirmDelete(false)
    setEditing(true)
  }

  async function save(): Promise<void> {
    setSaveError(null)
    const message = await onUpdateCapture(capture.id, {
      title: title.trim() || capture.title,
      url: capture.url,
      note: note.trim(),
      sourceApp: capture.sourceApp
    })
    if (message) {
      setSaveError(message)
      return
    }
    setEditing(false)
  }

  return (
    <article className={`organizer-item ${capture.note.trim() ? '' : 'unplaced'}`}>
      <div className="organizer-item-main">
        <SourceIcon iconUrl={capture.iconUrl} url={capture.url} appName={capture.sourceApp} />
        <div>
          <p className="capture-index">{index + 1}</p>
          {editing ? (
            <div className="capture-edit">
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="What should they know about this?"
              />
              {saveError ? <p className="organizer-alert">{saveError}</p> : null}
              <div className="organizer-move">
                <button type="button" className="primary-button" onClick={() => void save()}>
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle(capture.title)
                    setNote(capture.note)
                    setEditing(false)
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h4>{capture.title}</h4>
              {capture.url ? <p className="organizer-url">{capture.url}</p> : null}
              {capture.sourceApp ? <p className="organizer-note">{capture.sourceApp}</p> : null}
              {capture.note.trim() ? (
                <p className="organizer-note">{capture.note.trim()}</p>
              ) : (
                <p className="organizer-alert">Needs a takeaway</p>
              )}
            </>
          )}
        </div>
        {!editing ? (
          <div className="organizer-controls">
            <div className="organizer-move">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  setConfirmDelete(false)
                  void onMoveCapture(capture.id, 'up')
                }}
              >
                Move up
              </button>
              <button
                type="button"
                disabled={index === total - 1}
                onClick={() => {
                  setConfirmDelete(false)
                  void onMoveCapture(capture.id, 'down')
                }}
              >
                Move down
              </button>
              <button type="button" onClick={beginEdit}>
                Edit
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true)
                    return
                  }
                  void onDeleteCapture(capture.id)
                }}
              >
                {confirmDelete ? 'Delete?' : 'Delete'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export default function CaptureList({
  stack,
  onUpdateCapture,
  onDeleteCapture,
  onMoveCapture
}: CaptureListProps) {
  const captures = useMemo(() => stack.captures, [stack.captures])

  return (
    <section className="capture-organizer expanded">
      <header className="organizer-header">
        <div>
          <h2>Captures</h2>
          <p className="muted">Order is the Brief order. Each item needs a takeaway.</p>
        </div>
      </header>

      <div className="organizer-body">
        {captures.length === 0 ? (
          <p className="muted">Nothing here yet. Press Option + Space to capture without leaving your flow.</p>
        ) : (
          captures.map((capture, index) => (
            <CaptureItem
              key={capture.id}
              capture={capture}
              index={index}
              total={captures.length}
              onUpdateCapture={onUpdateCapture}
              onDeleteCapture={onDeleteCapture}
              onMoveCapture={onMoveCapture}
            />
          ))
        )}
      </div>
    </section>
  )
}
