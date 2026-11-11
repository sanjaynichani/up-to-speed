import { useMemo, useRef, useState } from 'react'
import type { Canvas, CaptureInput } from '@shared/types'
import { briefToMarkdown, briefToPlain } from '../lib/brief'
import { getStackHints } from '../lib/stack-hints'
import { formatTimestamp } from '../lib/markdown'
import BriefPreview from './BriefPreview'
import CaptureForm from './CaptureForm'
import CaptureList from './CaptureList'

interface StackViewProps {
  stack: Canvas
  onRename: (name: string) => Promise<string | null>
  onUpdateMeta: (purpose: string, recipient: string) => Promise<string | null>
  onAddCapture: (input: CaptureInput) => Promise<string | null>
  onUpdateCapture: (captureId: string, input: CaptureInput) => Promise<string | null>
  onDeleteCapture: (captureId: string) => Promise<void>
  onMoveCapture: (captureId: string, direction: 'up' | 'down') => Promise<void>
  onClear: () => Promise<string | null>
}

export default function StackView({
  stack,
  onRename,
  onUpdateMeta,
  onAddCapture,
  onUpdateCapture,
  onDeleteCapture,
  onMoveCapture,
  onClear
}: StackViewProps) {
  const [name, setName] = useState(stack.name)
  const [purpose, setPurpose] = useState(stack.purpose)
  const [recipient, setRecipient] = useState(stack.recipient)
  const draft = useRef({ purpose: stack.purpose, recipient: stack.recipient })
  const savedMeta = useRef({ purpose: stack.purpose.trim(), recipient: stack.recipient.trim() })
  const metaQueue = useRef(Promise.resolve())
  const [status, setStatus] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [manualAddOpen, setManualAddOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const hints = useMemo(() => getStackHints(stack), [stack])
  const markdown = useMemo(() => briefToMarkdown(stack), [stack])
  const plain = useMemo(() => briefToPlain(stack), [stack])

  function saveMeta(): Promise<void> {
    const run = metaQueue.current.then(async () => {
      const nextPurpose = draft.current.purpose.trim()
      const nextRecipient = draft.current.recipient.trim()
      if (
        nextPurpose === savedMeta.current.purpose &&
        nextRecipient === savedMeta.current.recipient
      ) {
        return
      }
      const message = await onUpdateMeta(nextPurpose, nextRecipient)
      if (!message) {
        savedMeta.current = { purpose: nextPurpose, recipient: nextRecipient }
      }
    })
    metaQueue.current = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }

  function shareWarning(): string {
    return hints.softWarnings.length > 0 ? ` Shared with notes: ${hints.softWarnings.join(' ')}` : ''
  }

  async function copyShare(label: string, value: string): Promise<void> {
    try {
      await window.api.copyText(value)
    } catch {
      setStatus(`Could not copy ${label}.`)
      return
    }
    setShareOpen(false)
    setConfirmClear(true)
    setStatus(`Copied ${label}.${shareWarning()}`)
  }

  async function shareFile(): Promise<void> {
    try {
      const saved = await window.api.saveMarkdown(markdown, stack.name)
      setShareOpen(false)
      if (!saved) {
        setStatus('Share canceled.')
        return
      }
      setConfirmClear(true)
      setStatus(`Saved Markdown file.${shareWarning()}`)
    } catch {
      setShareOpen(false)
      setStatus('Could not save the Markdown file.')
    }
  }

  async function clearStack(): Promise<void> {
    const message = await onClear()
    if (!message) {
      setConfirmClear(false)
    }
  }

  return (
    <main className="canvas-view stack-view">
      <header className="canvas-header drag-region">
        <div>
          <p className="eyebrow">Stack</p>
          <label className="field-block">
            Name
            <input
              className="canvas-title"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={(event) => {
                const next = event.currentTarget.value.trim()
                if (!next || next === stack.name) {
                  setName(stack.name)
                  return
                }
                setName(next)
                void onRename(next).then((message) => {
                  if (message) setName(stack.name)
                })
              }}
            />
          </label>
          <p className="muted">Updated {formatTimestamp(stack.updatedAt)}</p>
        </div>
      </header>

      <section className="handoff-setup stack-setup no-drag">
        <label>
          Purpose
          <input
            value={purpose}
            onChange={(event) => {
              draft.current.purpose = event.target.value
              setPurpose(event.target.value)
            }}
            onBlur={() => void saveMeta()}
            placeholder="What are you making?"
          />
        </label>
        <label>
          For <span className="optional">(optional)</span>
          <input
            value={recipient}
            onChange={(event) => {
              draft.current.recipient = event.target.value
              setRecipient(event.target.value)
            }}
            onBlur={() => void saveMeta()}
            placeholder="Person, channel, or team…"
          />
        </label>
      </section>

      <section className="preview-hero no-drag">
        <div className="preview-toolbar">
          <div className="readiness-indicator">
            {hints.softWarnings.length > 0 ? (
              <ul className="readiness-hints">
                {hints.softWarnings.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            ) : (
              <p className="readiness-ready">Brief looks shareable.</p>
            )}
          </div>
          <div className="preview-actions share-actions">
            <div className="share-menu">
              <button
                className="primary-button"
                type="button"
                onClick={() => setShareOpen((value) => !value)}
              >
                Share
              </button>
              {shareOpen ? (
                <div className="share-dropdown">
                  <button type="button" onClick={() => void copyShare('Markdown', markdown)}>
                    Copy Markdown
                  </button>
                  <button type="button" onClick={() => void copyShare('plain text', plain)}>
                    Copy plain
                  </button>
                  <button type="button" onClick={() => void shareFile()}>
                    Save .md
                  </button>
                </div>
              ) : null}
            </div>
            <button type="button" onClick={() => setConfirmClear(true)}>
              Clear
            </button>
          </div>
        </div>
        <BriefPreview stack={stack} />
      </section>

      {status ? <p className="status-banner">{status}</p> : null}

      {confirmClear ? (
        <section className="clear-prompt no-drag">
          <p>
            Shared? Clear this Stack so Up to Speed stays light.
          </p>
          <div className="organizer-move">
            <button className="primary-button" type="button" onClick={() => void clearStack()}>
              Clear stack
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmClear(false)
              }}
            >
              Keep for now
            </button>
          </div>
        </section>
      ) : null}

      <CaptureList
        stack={stack}
        onUpdateCapture={onUpdateCapture}
        onDeleteCapture={onDeleteCapture}
        onMoveCapture={onMoveCapture}
      />

      <section className="manual-add no-drag">
        <button type="button" className="manual-add-toggle" onClick={() => setManualAddOpen((value) => !value)}>
          {manualAddOpen ? 'Hide add a note or link' : 'Add a note or link'}
        </button>
        {manualAddOpen ? <CaptureForm onSubmit={onAddCapture} /> : null}
      </section>
    </main>
  )
}
