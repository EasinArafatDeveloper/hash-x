import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Staged (not-yet-executed) AI copilot write action — see src/lib/pending-actions.ts.
 * Stored in MongoDB (rather than an in-process Map) so a confirmation staged
 * by one server instance/serverless replica can be confirmed by another.
 */
export interface IPendingActionDocument extends Document {
  token: string;
  type: 'delete' | 'update' | 'tag' | 'edit_text';
  payload: any;
  createdBy: string;
  expiresAt: Date;
}

const PendingActionSchema: Schema = new Schema({
  token: { type: String, required: true, unique: true, index: true },
  type: { type: String, required: true, enum: ['delete', 'update', 'tag', 'edit_text'] },
  payload: { type: Schema.Types.Mixed, required: true },
  createdBy: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

PendingActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.PendingAction) {
  delete mongoose.models.PendingAction;
}

const PendingActionModel: Model<IPendingActionDocument> =
  mongoose.models.PendingAction || mongoose.model<IPendingActionDocument>('PendingAction', PendingActionSchema);

export default PendingActionModel;
