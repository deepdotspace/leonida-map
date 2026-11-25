/**
 * Lets `deepspace deploy` wait for a deploy with thousands of files.
 *
 * The first deploy of this app takes about eleven minutes, because the
 * platform copies the ~7,970 map tiles one at a time before it answers.
 * Two limits are shorter than that: Node's fetch gives up after 300 seconds
 * without a reply, and the deploy command allows its last request 240 seconds.
 * This file removes the first and stretches the second to fifteen minutes.
 * Later deploys only send what changed and take about a minute.
 *
 * Loaded by `npm run deploy`.
 */
import { Agent, setGlobalDispatcher } from 'undici'

setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }))

const COMMIT_TIMEOUT_MS = 240_000
const PATIENT_TIMEOUT_MS = 900_000
const timeout = AbortSignal.timeout.bind(AbortSignal)
AbortSignal.timeout = (ms) => timeout(ms === COMMIT_TIMEOUT_MS ? PATIENT_TIMEOUT_MS : ms)
