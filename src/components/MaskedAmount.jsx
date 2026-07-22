import { useState } from 'react'

// Respects the app-wide "show amounts" switch; when that's off, tapping a
// masked figure reveals just that one number without flipping the global switch.
export default function MaskedAmount({ value, show, prefix = '₹', className = '', mask = '••••••' }) {
  const [peek, setPeek] = useState(false)
  const revealed = show || peek

  return (
    <span
      onClick={show ? undefined : () => setPeek(p => !p)}
      className={`${className} ${show ? '' : 'cursor-pointer select-none'}`}
      title={show ? undefined : (revealed ? 'Tap to hide' : 'Tap to reveal')}
    >
      {revealed ? `${prefix}${Number(value || 0).toLocaleString('en-IN')}` : mask}
    </span>
  )
}
