import { useState } from 'react'
import type { FormEvent } from 'react'
import type { CaptureInput } from '@shared/types'

const emptyForm: CaptureInput = {
  title: '',
  url: '',
  note: ''
}

interface CaptureFormProps {
  onSubmit: (input: CaptureInput) => Promise<string | null>
}

export default function CaptureForm({ onSubmit }: CaptureFormProps) {
  const [form, setForm] = useState<CaptureInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!form.title.trim() || !form.note.trim()) {
      setError('A title and a takeaway are both required.')
      return
    }

    setSaving(true)
    setError(null)
    const message = await onSubmit(form)
    if (message) {
      setError(message)
      setSaving(false)
      return
    }
    setForm(emptyForm)
    setSaving(false)
  }

  return (
    <form className="capture-form manual-add-form" onSubmit={handleSubmit}>
      <label>
        Title
        <input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="Link, doc, note…"
          required
        />
      </label>

      <label>
        URL <span className="optional">(optional)</span>
        <input
          value={form.url}
          onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
          placeholder="https://"
        />
      </label>

      <label>
        Takeaway
        <textarea
          value={form.note}
          onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          placeholder="What should they know about this?"
          rows={3}
          required
        />
      </label>

      {error ? <p className="organizer-alert">{error}</p> : null}

      <button
        className="primary-button"
        type="submit"
        disabled={saving || !form.title.trim() || !form.note.trim()}
      >
        {saving ? 'Adding…' : 'Add to stack'}
      </button>
    </form>
  )
}
