import type { Canvas } from '@shared/types'
import { briefToMarkdown } from '../lib/brief'

interface BriefPreviewProps {
  stack: Canvas
}

export default function BriefPreview({ stack }: BriefPreviewProps) {
  if (stack.captures.length === 0 && !stack.purpose.trim()) {
    return (
      <div className="handoff-preview empty">
        <p>Your Brief will appear here. Capture with Option + Space, then Share when it’s ready.</p>
      </div>
    )
  }

  return (
    <article className="handoff-preview">
      <header className="preview-doc-header">
        <p className="eyebrow">Shape · Brief</p>
        <h2>{stack.name}</h2>
        {stack.purpose.trim() ? (
          <p className="preview-outcome">
            <strong>Purpose:</strong> {stack.purpose.trim()}
          </p>
        ) : null}
        {stack.recipient.trim() ? (
          <p className="preview-meta">For {stack.recipient.trim()}</p>
        ) : null}
      </header>

      {stack.captures.length > 0 ? (
        <section className="preview-section">
          <h3>Context</h3>
          <ol className="brief-context-list">
            {stack.captures.map((capture) => (
              <li key={capture.id} className="preview-capture">
                <p>{capture.note.trim() || capture.title}</p>
                <p className="preview-meta">
                  {[capture.title, capture.url, capture.sourceApp].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <details className="brief-raw">
        <summary>Markdown preview</summary>
        <pre>{briefToMarkdown(stack)}</pre>
      </details>
    </article>
  )
}
