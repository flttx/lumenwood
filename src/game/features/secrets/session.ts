import { createSecretState } from './secrets'

/** Frame-owned partial puzzle progress, shared with guidance; only solved results persist in route saves. */
export const secretSession = { state: createSecretState() }
