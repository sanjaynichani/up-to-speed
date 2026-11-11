import { useState } from 'react'

function labelFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').charAt(0).toUpperCase() || '?'
  } catch {
    return '?'
  }
}

interface SourceIconProps {
  iconUrl?: string
  url?: string
  appName?: string
  className?: string
}

export default function SourceIcon({ iconUrl, url, appName, className = '' }: SourceIconProps) {
  const [broken, setBroken] = useState(false)
  const label =
    (url ? labelFromUrl(url) : null) ??
    (appName?.trim().charAt(0).toUpperCase() || '?')

  return (
    <div className={`source-icon ${className}`.trim()} aria-hidden="true">
      {iconUrl && !broken ? (
        <img src={iconUrl} alt="" onError={() => setBroken(true)} />
      ) : (
        <span>{label}</span>
      )}
    </div>
  )
}
