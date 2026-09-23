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

const ActivityLogModel: Model<IActivityLogDocument> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLogDocument>('ActivityLog', ActivityLogSchema);

export default ActivityLogModel;
