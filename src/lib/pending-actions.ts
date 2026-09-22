import crypto from 'crypto';

/**
 * Short-lived server-side store for any dangerous/data-changing action
 * (delete, update fields, tag changes, text edits) that the AI copilot has
 * only *previewed* so far. The AI model decides *when* to ask for
 * confirmation and *when* the user has confirmed, but the actual write only
 * ever runs against the exact payload captured at preview time, under the
 * token issued here — the model's own judgement (or a hallucinated value)
 * is never enough by itself to change or delete real data.
 */
export type PendingActionType = 'delete' | 'update' | 'tag' | 'edit_text';

interface PendingAction {
  type: PendingActionType;
  payload: any;
  createdBy: string;
  expiresAt: number;
}

const store = new Map<string, PendingAction>();

const TTL_MS = 5 * 60 * 1000; // 5 minutes

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [token, action] of store.entries()) {
      if (action.expiresAt < now) store.delete(token);
    }
  }, 60 * 1000);
}

export function createPendingAction(type: PendingActionType, payload: any, createdBy: string): string {
  const token = crypto.randomBytes(12).toString('hex');
  store.set(token, { type, payload, createdBy, expiresAt: Date.now() + TTL_MS });
  return token;
}

/**
 * Validates and burns a pending action token. Returns the staged action, or
 * null if the token is missing, expired, or belongs to a different user
 * than the one confirming it.
 */
export function consumePendingAction(
  token: string,
  confirmingUser: string
): { type: PendingActionType; payload: any } | null {
  const action = store.get(token);
  if (!action) return null;
  if (action.expiresAt < Date.now()) {
    store.delete(token);
    return null;
  }
  if (action.createdBy !== confirmingUser) return null;
  store.delete(token);
  return { type: action.type, payload: action.payload };
}
