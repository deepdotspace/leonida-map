/**
 * UI primitives — correct-by-default, built on Base UI (@base-ui/react) and
 * styled entirely with the app's semantic theme tokens. These are yours:
 * restyle or delete them freely. Build app-specific components alongside them.
 *
 * The look comes from the token values in `styles.css`
 * (colors, `--radius`, shadows) — change those to change the app, without
 * touching these files.
 *
 * @example
 * import { Button, Dialog, useToast } from '../components/ui'
 */

/* Utility */
export { cn } from '@/lib/utils'

/* Form */
export { Button, buttonVariants, type ButtonProps } from './Button'
export { Input } from './Input'
export { Textarea } from './Textarea'
export { SearchInput } from './SearchInput'
export { Switch } from './Switch'

/* Data display */
export { Avatar, AvatarImage, AvatarFallback } from './Avatar'

/* Feedback */
export { ToastProvider, useToast } from './Toast'

/* Overlay — `Modal` for simple controlled dialogs; the `Dialog` family for
 * triggers, nesting, and custom composition. */
export {
  Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from './Dialog'
export { Modal, ConfirmModal } from './Modal'
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup,
  DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuRadioGroup,
} from './DropdownMenu'
