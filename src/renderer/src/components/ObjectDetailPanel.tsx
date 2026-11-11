import { useEffect, useState } from 'react'
import type {
  DetailWorkObjectType,
  WorkObject,
  WorkObjectUpdate
} from '@shared/types'
import { DETAIL_WORK_OBJECT_TYPES } from '@shared/types'
import { formatTimestamp } from '../lib/markdown'

interface ObjectDetailPanelProps {
  object: WorkObject
  onSave: (id: string, input: WorkObjectUpdate) => Promise<string | null>
  onClose: () => void
}

function asDetailType(type: WorkObject['type']): DetailWorkObjectType {
  return (DETAIL_WORK_OBJECT_TYPES as readonly string[]).includes(type)
    ? (type as DetailWorkObjectType)
    : 'capture'
}

export default function ObjectDetailPanel({ object, onSave, onClose }: ObjectDetailPanelProps) {
  const [title, setTitle] = useState(object.title)
  const [blurb, setBlurb] = useState(object.blurb ?? '')
  const [body, setBody] = useState(object.body ?? '')
  const [type, setType] = useState<DetailWorkObjectType>(asDetailType(object.type))
  const [status, setStatus] = useState<'inbox' | 'today'>(
    object.status === 'today' ? 'today' : 'inbox'
  )
  const [appName, setAppName] = useState(object.source?.appName ?? '')
  const [windowTitle, setWindowTitle] = useState(object.source?.windowTitle ?? '')
  const [url, setUrl] = useState(object.source?.url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTitle(object.title)
    setBlurb(object.blurb ?? '')
    setBody(object.body ?? '')
    setType(asDetailType(object.type))
    setStatus(object.status === 'today' ? 'today' : 'inbox')
    setAppName(object.source?.appName ?? '')
    setWindowTitle(object.source?.windowTitle ?? '')
    setUrl(object.source?.url ?? '')
    setError(null)
    setSaving(false)
  }, [object.id, object.updatedAt])

  async function handleSave(): Promise<void> {
    setSaving(true)
    setError(null)
    const message = await onSave(object.id, {
      title: title.trim() || object.title,
      blurb: blurb.trim(),
      body: body.trim(),
      type,
      status,
      source: {
        appName: appName.trim(),
        windowTitle: windowTitle.trim(),
        url: url.trim()
      }
    })
    if (message) {
      setError(message)
    }
    setSaving(false)
  }

  return (
    <aside className="object-detail">
      <header className="object-detail-header">
        <div>
          <p className="eyebrow">Object</p>
          <h2>Detail</h2>
        </div>
        <button type="button" className="ghost-button" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="object-detail-form">
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label>
          Blurb
          <textarea
            value={blurb}
            onChange={(event) => setBlurb(event.target.value)}
            rows={2}
            placeholder="Why this matters"
          />
        </label>

        <label>
          Body / notes
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            placeholder="Longer notes…"
          />
        </label>

        <div className="object-detail-row">
          <label>
            Type
            <select
              value={type}
              onChange={(event) => setType(event.target.value as DetailWorkObjectType)}
            >
              {DETAIL_WORK_OBJECT_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'inbox' | 'today')}
            >
              <option value="inbox">inbox</option>
              <option value="today">today</option>
            </select>
          </label>
        </div>

        <fieldset className="object-detail-source">
          <legend>Source</legend>
          <label>
            App
            <input value={appName} onChange={(event) => setAppName(event.target.value)} />
          </label>
          <label>
            Window title
            <input value={windowTitle} onChange={(event) => setWindowTitle(event.target.value)} />
          </label>
          <label>
            URL
            <input value={url} onChange={(event) => setUrl(event.target.value)} />
          </label>
        </fieldset>

        <div className="object-detail-meta">
          <p>
            <span>Created</span> {formatTimestamp(object.createdAt)}
          </p>
          <p>
            <span>Updated</span> {formatTimestamp(object.updatedAt)}
          </p>
        </div>

        {error ? <p className="object-detail-error">{error}</p> : null}

        <div className="object-detail-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saving || !title.trim() || (!blurb.trim() && !body.trim())}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </aside>
  )
}
