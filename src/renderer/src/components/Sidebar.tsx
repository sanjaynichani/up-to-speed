import { useState } from 'react'
import type { Canvas } from '@shared/types'

interface SidebarProps {
  stacks: Canvas[]
  inboxCount: number
  todayCount: number
  inboxActive: boolean
  todayActive: boolean
  activeStackId: string | null
  storePath: string
  shortcutReady: boolean
  onOpenCapture: () => void
  onSelectInbox: () => void
  onSelectToday: () => void
  onCreate: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export default function Sidebar({
  stacks,
  inboxCount,
  todayCount,
  inboxActive,
  todayActive,
  activeStackId,
  storePath,
  shortcutReady,
  onOpenCapture,
  onSelectInbox,
  onSelectToday,
  onCreate,
  onSelect,
  onDelete
}: SidebarProps) {
  const [pendingClearId, setPendingClearId] = useState<string | null>(null)

  return (
    <aside className="sidebar">
      <div className="brand">
        <p className="eyebrow">Short-term memory</p>
        <h1>Up to Speed</h1>
      </div>

      <div className="sidebar-actions">
        <button className="primary-button full-width" type="button" onClick={onCreate}>
          New stack
        </button>
        <button className="full-width" type="button" onClick={onOpenCapture}>
          Quick capture
        </button>
      </div>

      <div className="canvas-list">
        <div className={`canvas-item ${inboxActive ? 'active' : ''}`}>
          <button type="button" className="canvas-select" onClick={onSelectInbox}>
            <span>Inbox</span>
            <small>
              {inboxCount} item{inboxCount === 1 ? '' : 's'}
            </small>
          </button>
        </div>

        <div className={`canvas-item ${todayActive ? 'active' : ''}`}>
          <button type="button" className="canvas-select" onClick={onSelectToday}>
            <span>Today</span>
            <small>
              {todayCount} item{todayCount === 1 ? '' : 's'}
            </small>
          </button>
        </div>

        {stacks.length === 0 ? (
          <p className="muted">No stacks yet. Create one when you’re about to ship something.</p>
        ) : (
          stacks.map((stack) => (
            <div
              key={stack.id}
              className={`canvas-item ${!inboxActive && !todayActive && stack.id === activeStackId ? 'active' : ''}`}
            >
              <button type="button" className="canvas-select" onClick={() => onSelect(stack.id)}>
                <span>{stack.name}</span>
                <small>
                  {stack.captures.length} capture{stack.captures.length === 1 ? '' : 's'}
                  {stack.purpose.trim() ? ` · ${stack.purpose.trim()}` : ''}
                </small>
              </button>
              <button
                type="button"
                className={`ghost-button ${pendingClearId === stack.id ? 'confirming' : ''}`}
                aria-label={
                  pendingClearId === stack.id ? `Confirm clear ${stack.name}` : `Clear ${stack.name}`
                }
                onClick={() => {
                  if (pendingClearId === stack.id) {
                    setPendingClearId(null)
                    onDelete(stack.id)
                    return
                  }
                  setPendingClearId(stack.id)
                }}
              >
                {pendingClearId === stack.id ? 'Clear' : '×'}
              </button>
            </div>
          ))
        )}
      </div>

      <p className="store-path" title={storePath}>
        {shortcutReady
          ? 'Local only · Option + Space to capture'
          : 'Local only · Option + Space is used by another app'}
      </p>
    </aside>
  )
}
