import crypto from 'crypto';
import connectToDatabase from './db';
import PendingActionModel from './models/PendingAction';

/**
 * Short-lived, MongoDB-backed store for any dangerous/data-changing action
 * (delete, update fields, tag changes, text edits) that the AI copilot has
 * only *previewed* so far. Backed by the database (rather than an
 * in-process Map) so a confirmation staged on one server instance can be
 * confirmed by another. The AI model decides *when* to ask for
 * confirmation and *when* the user has confirmed, but the actual write only
 * ever runs against the exact payload captured at preview time, under the
 * token issued here — the model's own judgement (or a hallucinated value)
 * is never enough by itself to change or delete real data.
 */
export type PendingActionType = 'delete' | 'update' | 'tag' | 'edit_text';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function createPendingAction(
  type: PendingActionType,
  payload: any,
  createdBy: string
): Promise<string> {
  await connectToDatabase();
  const token = crypto.randomBytes(12).toString('hex');
  await PendingActionModel.create({
    token,
    type,
    payload,
    createdBy,
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  return token;
}

/**
 * Validates and atomically consumes (deletes) a pending action token.
 * Returns the staged action, or null if the token is missing, expired, or
 * belongs to a different user than the one confirming it. Using
 * findOneAndDelete makes this safe against a token being confirmed twice
 * concurrently — only one caller can ever win the delete.
 */
export async function consumePendingAction(
  token: string,
  confirmingUser: string
): Promise<{ type: PendingActionType; payload: any } | null> {
  if (!token) return null;
  await connectToDatabase();

  const doc = await PendingActionModel.findOneAndDelete({
    token,
    createdBy: confirmingUser,
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!doc) return null;
  return { type: (doc as any).type, payload: (doc as any).payload };
}
