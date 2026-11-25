import { useEffect, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { mapButtonClass } from './map-button'

/** Toggles full screen. Renders nothing where the browser cannot do it (iPhones). */
export function FullscreenButton() {
  const [supported, setSupported] = useState(false)
  const [active, setActive] = useState(false)

  useEffect(() => {
    setSupported(document.fullscreenEnabled)
    const update = () => setActive(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])

  if (!supported) return null
  const Icon = active ? Minimize : Maximize
  const label = active ? 'Exit full screen' : 'Full screen'
  return (
    <button
      type="button"
      data-testid="fullscreen"
      aria-label={label}
      title={label}
      onClick={() => (active ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
      className={mapButtonClass}
    >
      <Icon size={16} />
    </button>
  )
}
