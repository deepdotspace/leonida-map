import { UserRound } from 'lucide-react'
import { mapButtonClass } from '../map/map-button'

/** The small corner button a signed-out visitor sees. */
export function SignInButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      data-testid="map-sign-in"
      onClick={onClick}
      disabled={!onClick}
      title="Sign in to keep your progress on all your devices"
      className={mapButtonClass}
    >
      <UserRound size={16} />
      <span className="hidden sm:inline">Sign in</span>
    </button>
  )
}
