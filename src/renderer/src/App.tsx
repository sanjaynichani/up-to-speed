import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { readableError } from '@shared/readable-error'
import type { AppState, CaptureInput } from '@shared/types'
import InboxView from './components/InboxView'
import Sidebar from './components/Sidebar'
import StackView from './components/StackView'
import TodayView from './components/TodayView'

type ActiveView = 'inbox' | 'today' | { stackId: string }

function nextStackName(existingNames: string[]): string {
  const used = new Set(existingNames)
  if (!used.has('Untitled stack')) {
    return 'Untitled stack'
  }

  let index = 2
  while (used.has(`Untitled stack ${index}`)) {
    index += 1
  }
  return `Untitled stack ${index}`
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null)
  const [storePath, setStorePath] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newPurpose, setNewPurpose] = useState('')
  const [newRecipient, setNewRecipient] = useState('')
  const [activeView, setActiveView] = useState<ActiveView>('inbox')
  const [notice, setNotice] = useState<string | null>(null)
  const [shortcutReady, setShortcutReady] = useState(true)

  async function run(action: () => Promise<unknown>, fallback: string): Promise<string | null> {
    try {
      await action()
      setNotice(null)
      return null
    } catch (reason: unknown) {
      const message = readableError(reason, fallback)
      setNotice(message)
      return message
    }
  }

  function settled(action: () => Promise<unknown>, fallback: string): Promise<void> {
    return run(action, fallback).then(() => undefined)
  }

  useEffect(() => {
    void Promise.all([window.api.getState(), window.api.getStorePath(), window.api.shortcutReady()])
      .then(([nextState, path, shortcut]) => {
        setState(nextState)
        setStorePath(path)
        setShortcutReady(shortcut)
      })
      .catch((reason: unknown) => {
        setError(readableError(reason, 'Could not load local data.'))
      })

    return window.api.onStateUpdated((nextState) => {
      setState(nextState)
    })
  }, [])

  const inboxCount = state?.workObjects.filter((object) => object.status === 'inbox').length ?? 0
  const todayCount = state?.workObjects.filter((object) => object.status === 'today').length ?? 0
  const activeStackId = typeof activeView === 'object' ? activeView.stackId : null
  const activeStack = activeStackId
    ? (state?.canvases.find((canvas) => canvas.id === activeStackId) ?? null)
    : null

  async function createStack(name: string, purpose: string, recipient: string): Promise<void> {
    const trimmedName = name.trim() || nextStackName(state?.canvases.map((canvas) => canvas.name) ?? [])
    await settled(async () => {
      const next = await window.api.createCanvas({
        name: trimmedName,
        purpose: purpose.trim(),
        recipient: recipient.trim()
      })
      setState(next)
      if (next.activeCanvasId) {
        setActiveView({ stackId: next.activeCanvasId })
      }
      setNewName('')
      setNewPurpose('')
      setNewRecipient('')
    }, 'Could not create the stack.')
  }

  if (error) {
    return (
      <div className="boot-screen">
        <h1>Could not open Up to Speed</h1>
        <p>{error}</p>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="boot-screen">
        <p>Loading your stacks…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar
        stacks={state.canvases}
        inboxCount={inboxCount}
        todayCount={todayCount}
        inboxActive={activeView === 'inbox'}
        todayActive={activeView === 'today'}
        activeStackId={activeStackId}
        storePath={storePath}
        shortcutReady={shortcutReady}
        onOpenCapture={() => {
          void settled(async () => {
            await window.api.openCaptureOverlay()
          }, 'Could not open capture.')
        }}
        onSelectInbox={() => setActiveView('inbox')}
        onSelectToday={() => setActiveView('today')}
        onCreate={() =>
          void createStack(nextStackName(state.canvases.map((canvas) => canvas.name)), '', '')
        }
        onSelect={(id) => {
          setActiveView({ stackId: id })
          void settled(async () => {
            setState(await window.api.setActiveCanvas(id))
          }, 'Could not open that stack.')
        }}
        onDelete={(id) => {
          void settled(async () => {
            const next = await window.api.deleteCanvas(id)
            setState(next)
            if (typeof activeView === 'object' && activeView.stackId === id) {
              setActiveView('inbox')
            }
          }, 'Could not clear that stack.')
        }}
      />

      <div className="app-main">
      {notice ? (
        <div className="app-notice" role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {activeView === 'inbox' ? (
        <InboxView
          objects={state.workObjects}
          stacks={state.canvases}
          onMoveToToday={(id) =>
            run(async () => setState(await window.api.setWorkObjectStatus(id, 'today')), 'Could not move that item.')
          }
          onPlaceOnStack={(objectId, stackId) =>
            run(async () => {
              setState(await window.api.placeWorkObjectOnStack(objectId, stackId))
              setActiveView({ stackId })
            }, 'Could not add that item to the stack.')
          }
          onUpdate={(id, input) =>
            run(async () => setState(await window.api.updateWorkObject(id, input)), 'Could not save that item.')
          }
          onDelete={(id) =>
            run(async () => setState(await window.api.deleteWorkObject(id)), 'Could not delete that item.')
          }
        />
      ) : activeView === 'today' ? (
        <TodayView
          objects={state.workObjects}
          stacks={state.canvases}
          onMoveToInbox={(id) =>
            run(async () => setState(await window.api.setWorkObjectStatus(id, 'inbox')), 'Could not move that item.')
          }
          onPlaceOnStack={(objectId, stackId) =>
            run(async () => {
              setState(await window.api.placeWorkObjectOnStack(objectId, stackId))
              setActiveView({ stackId })
            }, 'Could not add that item to the stack.')
          }
          onUpdate={(id, input) =>
            run(async () => setState(await window.api.updateWorkObject(id, input)), 'Could not save that item.')
          }
          onDelete={(id) =>
            run(async () => setState(await window.api.deleteWorkObject(id)), 'Could not delete that item.')
          }
        />
      ) : activeStack ? (
        <StackView
          key={activeStack.id}
          stack={activeStack}
          onRename={(name) =>
            run(async () => setState(await window.api.renameCanvas(activeStack.id, name)), 'Could not rename the stack.')
          }
          onUpdateMeta={(purpose, recipient) =>
            run(
              async () => setState(await window.api.updateCanvasMeta(activeStack.id, { purpose, recipient })),
              'Could not save the stack.'
            )
          }
          onAddCapture={(input: CaptureInput) =>
            run(async () => setState(await window.api.addCapture(activeStack.id, input)), 'Could not add that capture.')
          }
          onUpdateCapture={(captureId, input) =>
            run(
              async () => setState(await window.api.updateCapture(activeStack.id, captureId, input)),
              'Could not update that capture.'
            )
          }
          onDeleteCapture={(captureId) =>
            settled(
              async () => setState(await window.api.deleteCapture(activeStack.id, captureId)),
              'Could not delete that capture.'
            )
          }
          onMoveCapture={(captureId, direction) =>
            settled(
              async () => setState(await window.api.moveCapture(activeStack.id, captureId, direction)),
              'Could not reorder that capture.'
            )
          }
          onClear={() =>
            run(async () => {
              setState(await window.api.deleteCanvas(activeStack.id))
              setActiveView('inbox')
            }, 'Could not clear that stack.')
          }
        />
      ) : (
        <main className="empty-app">
          <p className="eyebrow">New stack</p>
          <h1>Collect what you need, ship a brief, clear it.</h1>
          <p>Short-term memory for work you’re actively moving forward — not another notes inbox.</p>
          <form
            className="empty-form stack-setup-form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault()
              void createStack(newName, newPurpose, newRecipient)
            }}
          >
            <label>
              Stack name
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Call with Meghan"
                autoFocus
              />
            </label>
            <label>
              Purpose
              <input
                value={newPurpose}
                onChange={(event) => setNewPurpose(event.target.value)}
                placeholder="What are you making — Slack update, brief, follow-up…"
              />
            </label>
            <label>
              For <span className="optional">(optional)</span>
              <input
                value={newRecipient}
                onChange={(event) => setNewRecipient(event.target.value)}
                placeholder="Person, channel, or team…"
              />
            </label>
            <button className="primary-button" type="submit">
              Create stack
            </button>
          </form>
        </main>
      )}
      </div>
    </div>
  )
}
