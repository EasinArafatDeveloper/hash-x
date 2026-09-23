import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityLogDocument extends Document {
  action: string;
  description: string;
  user: string;
  type: 'upload' | 'export' | 'filter' | 'system' | 'auth';
  createdAt: Date;
}

const ActivityLogSchema: Schema = new Schema(
  {
    action: { type: String, required: true },
    description: { type: String, required: true },
    user: { type: String, default: 'Easin Arafat' },
    type: { type: String, enum: ['upload', 'export', 'filter', 'system', 'auth'], default: 'system' },
  },
  { timestamps: true }
);

// Auto-purge activity log entries after 90 days so this collection doesn't
// grow forever and quietly eat into the database's storage quota.
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const ActivityLogModel: Model<IActivityLogDocument> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLogDocument>('ActivityLog', ActivityLogSchema);

export default ActivityLogModel;
