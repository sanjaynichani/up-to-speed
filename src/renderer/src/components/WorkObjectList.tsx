import { useEffect, useMemo, useState } from 'react'
import type { Canvas, WorkObject, WorkObjectStatus, WorkObjectUpdate } from '@shared/types'
import { formatTimestamp } from '../lib/markdown'
import ObjectDetailPanel from './ObjectDetailPanel'
import SourceIcon from './SourceIcon'

export interface WorkObjectListProps {
  status: Extract<WorkObjectStatus, 'inbox' | 'today'>
  eyebrow: string
  heading: string
  description: string
  emptyMessage: string
  objects: WorkObject[]
  stacks: Canvas[]
  moveLabel: string
  onMove: (id: string) => Promise<string | null>
  onPlaceOnStack: (objectId: string, stackId: string) => Promise<string | null>
  onUpdate: (id: string, input: WorkObjectUpdate) => Promise<string | null>
  onDelete: (id: string) => Promise<string | null>
}

function takeawayPreview(object: WorkObject): string {
  return object.blurb?.trim() || object.body?.trim() || ''
}

function WorkObjectItem({
  object,
  selected,
  stacks,
  moveLabel,
  onSelect,
  onMove,
  onPlaceOnStack,
  onDelete
}: {
  object: WorkObject
  selected: boolean
  stacks: Canvas[]
  moveLabel: string
  onSelect: (id: string) => void
  onMove: (id: string) => Promise<string | null>
  onPlaceOnStack: (objectId: string, stackId: string) => Promise<string | null>
  onDelete: (id: string) => Promise<string | null>
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <article className={`organizer-item ${selected ? 'selected' : ''} ${takeawayPreview(object) ? '' : 'unplaced'}`}>
      <button type="button" className="object-row-select" onClick={() => onSelect(object.id)}>
        <SourceIcon
          iconUrl={object.source?.iconUrl}
          url={object.source?.url}
          appName={object.source?.appName}
        />
        <div className="object-row-copy">
          <h4>{object.title}</h4>
        {takeawayPreview(object) ? (
          <p className="organizer-note">{takeawayPreview(object)}</p>
        ) : (
          <p className="organizer-alert">Needs a takeaway</p>
        )}
        {object.source?.appName || object.source?.url ? (
          <div className="inbox-source">
            {object.source.appName ? <span>{object.source.appName}</span> : null}
            {object.source.url ? <span className="organizer-url">{object.source.url}</span> : null}
          </div>
        ) : null}
        <p className="inbox-time">{formatTimestamp(object.updatedAt)}</p>
        </div>
      </button>
      <div className="organizer-controls">
        <div className="organizer-move">
          {stacks.length > 0 ? (
            <select
              className="stack-place-select"
              value=""
              aria-label={`Add ${object.title} to stack`}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const stackId = event.target.value
                if (stackId) {
                  setConfirmDelete(false)
                  void onPlaceOnStack(object.id, stackId)
                  event.target.value = ''
                }
              }}
            >
              <option value="">Add to stack…</option>
              {stacks.map((stack) => (
                <option key={stack.id} value={stack.id}>
                  {stack.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setConfirmDelete(false)
              void onMove(object.id)
            }}
          >
            {moveLabel}
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={(event) => {
              event.stopPropagation()
              if (!confirmDelete) {
                setConfirmDelete(true)
                return
              }
              void onDelete(object.id)
            }}
          >
            {confirmDelete ? 'Delete?' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function WorkObjectList({
  status,
  eyebrow,
  heading,
  description,
  emptyMessage,
  objects,
  stacks,
  moveLabel,
  onMove,
  onPlaceOnStack,
  onUpdate,
  onDelete
}: WorkObjectListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const items = useMemo(
    () =>
      objects
        .filter((object) => object.status === status)
        .slice()
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [objects, status]
  )

  const selected = selectedId ? (items.find((item) => item.id === selectedId) ?? null) : null

  useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null)
    }
  }, [items, selectedId])

  async function handleMove(id: string): Promise<string | null> {
    const message = await onMove(id)
    if (!message && selectedId === id) {
      setSelectedId(null)
    }
    return message
  }

  async function handlePlaceOnStack(objectId: string, stackId: string): Promise<string | null> {
    const message = await onPlaceOnStack(objectId, stackId)
    if (!message && selectedId === objectId) {
      setSelectedId(null)
    }
    return message
  }

  async function handleDelete(id: string): Promise<string | null> {
    const message = await onDelete(id)
    if (!message && selectedId === id) {
      setSelectedId(null)
    }
    return message
  }

  async function handleSave(id: string, input: WorkObjectUpdate): Promise<string | null> {
    const message = await onUpdate(id, input)
    if (!message && input.status !== status) {
      setSelectedId(null)
    }
    return message
  }

  return (
    <main className={`inbox-view ${selected ? 'with-detail' : ''}`}>
      <div className="inbox-main">
        <header className="canvas-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{heading}</h1>
            <p className="muted">{description}</p>
          </div>
        </header>

        <section className="capture-organizer expanded">
          <header className="organizer-header">
            <div>
              <h2>{eyebrow}</h2>
              <p className="muted">
                {items.length} item{items.length === 1 ? '' : 's'}
              </p>
            </div>
          </header>

          <div className="organizer-body">
            {items.length === 0 ? (
              <p className="muted">{emptyMessage}</p>
            ) : (
              items.map((object) => (
                <WorkObjectItem
                  key={object.id}
                  object={object}
                  selected={object.id === selectedId}
                  stacks={stacks}
                  moveLabel={moveLabel}
                  onSelect={setSelectedId}
                  onMove={handleMove}
                  onPlaceOnStack={handlePlaceOnStack}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {selected ? (
        <ObjectDetailPanel
          object={selected}
          onSave={handleSave}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </main>
  )
}
