/** Lets a visitor tell us a pin is wrong. Reports are stored for the map's admins. */

import { useState } from 'react'
import { useMutations } from 'deepspace'
import { Button, Modal, Textarea, cn, useToast } from '@/components/ui'
import type { Pin } from '../map/pins'
import { REPORT_DETAILS_MAX, REPORT_PROBLEMS } from '../schemas/reports-schema'

interface Report {
  pinId: string
  problem: string
  details: string
}

export function ReportDialog({ pin, onClose }: { pin: Pin; onClose: () => void }) {
  const { ready, createConfirmed } = useMutations<Report>('reports')
  const { success, error } = useToast()
  const [problem, setProblem] = useState<string>(REPORT_PROBLEMS[0])
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    setSending(true)
    try {
      await createConfirmed({ pinId: pin.id, problem, details: details.trim() })
      success('Thank you', 'We will take a look at this place.')
      onClose()
    } catch {
      error('Could not send the report', 'Please try again.')
      setSending(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="sm" data-testid="report-dialog">
      <Modal.Header>
        <Modal.Title>Report a problem</Modal.Title>
        <Modal.Description>{pin.name}</Modal.Description>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-3">
        <div role="radiogroup" aria-label="What is wrong?" className="grid grid-cols-2 gap-2">
          {REPORT_PROBLEMS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={problem === option}
              onClick={() => setProblem(option)}
              className={cn(
                'cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                problem === option
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <Textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={REPORT_DETAILS_MAX}
          rows={3}
          placeholder="Anything that helps us fix it (optional)"
          aria-label="Details"
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={send} disabled={!ready} loading={sending}>
          Send report
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
