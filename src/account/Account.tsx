/**
 * The optional account: sign-in, the corner account menu, syncing saved map
 * data to the account, and the report dialog (which stores reports on the
 * server). This is the only part of the map that talks to DeepSpace auth and
 * records, and the map page loads it on demand, so a visitor without an
 * account never makes a session request or opens a socket.
 */

import { useEffect } from 'react'
import {
  AuthOverlay,
  DeepSpaceAuthProvider,
  RecordProvider,
  RecordScope,
  signOut,
  useAuthStatus,
  useAuthUser,
} from 'deepspace'
import { Check, LogOut } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
} from '@/components/ui'
import { SCOPE_ID } from '../constants'
import { mapButtonClass } from '../map/map-button'
import type { Pin } from '../map/pins'
import { forgetSavedData } from '../map/user-data'
import { schemas } from '../schemas'
import { rememberAccount } from './remembered'
import { ReportDialog } from './ReportDialog'
import { SignInButton } from './SignInButton'
import { SyncSavedData } from './SyncSavedData'

interface AccountProps {
  signInOpen: boolean
  onSignInOpenChange: (open: boolean) => void
  /** The pin a problem is being reported on, if the report dialog is open. */
  reportPin: Pin | null
  onReportClose: () => void
}

export default function Account(props: AccountProps) {
  return (
    <DeepSpaceAuthProvider>
      <AccountBody {...props} />
    </DeepSpaceAuthProvider>
  )
}

function AccountBody({ signInOpen, onSignInOpenChange, reportPin, onReportClose }: AccountProps) {
  const { isLoaded, isSignedIn } = useAuthStatus()
  const { error, warning } = useToast()

  useEffect(() => {
    if (isLoaded) rememberAccount(isSignedIn || signInOpen)
  }, [isLoaded, isSignedIn, signInOpen])

  useEffect(() => {
    if (isSignedIn && signInOpen) onSignInOpenChange(false)
  }, [isSignedIn, signInOpen, onSignInOpenChange])

  if (!isLoaded) return <SignInButton />

  return (
    <>
      {isSignedIn ? <AccountMenu /> : <SignInButton onClick={() => onSignInOpenChange(true)} />}
      {!isSignedIn && signInOpen && (
        <AuthOverlay
          title="Sign in to Leonida Map"
          description="Keep your found places, favourites, notes and markers on all your devices."
          onClose={() => onSignInOpenChange(false)}
        />
      )}
      {(isSignedIn || reportPin) && (
        <RecordProvider
          allowAnonymous
          onWriteError={(e) => (e.kind === 'permission' ? warning(e.title, e.detail) : error(e.title, e.detail))}
        >
          <RecordScope roomId={SCOPE_ID} schemas={schemas}>
            {isSignedIn && <SyncSavedData />}
            {reportPin && <ReportDialog pin={reportPin} onClose={onReportClose} />}
          </RecordScope>
        </RecordProvider>
      )}
    </>
  )
}

function AccountMenu() {
  const { user } = useAuthUser()
  const email = user?.primaryEmailAddress?.emailAddress
  const name = user?.fullName || email || 'Signed in'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" data-testid="map-account" aria-label="Account" className={mapButtonClass}>
            <Avatar className="size-6">
              <AvatarImage src={user?.imageUrl ?? undefined} referrerPolicy="no-referrer" />
              <AvatarFallback className="text-[11px]">{name[0].toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="truncate font-medium text-foreground">{name}</div>
          {email && email !== name && (
            <div data-testid="map-account-email" className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-normal text-success">
            <Check size={12} />
            Saved to your account
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          // Forget only once signed out: while signed in, the sync would copy the account's data straight back.
          onClick={() => void signOut().finally(forgetSavedData)}
        >
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
