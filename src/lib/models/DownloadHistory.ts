import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDownloadHistoryDocument extends Document {
  filename: string;
  recordCount: number;
  filtersApplied: string;
  createdAt: Date;
  status: string;
}

const DownloadHistorySchema: Schema = new Schema(
  {
    filename: { type: String, required: true },
    recordCount: { type: Number, required: true },
    filtersApplied: { type: String, default: 'None' },
    status: { type: String, default: 'Ready' },
  },
  { timestamps: true }
);

// Auto-purge download history entries after 90 days so this collection
// doesn't grow forever and quietly eat into the database's storage quota.
DownloadHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const DownloadHistoryModel: Model<IDownloadHistoryDocument> =
  mongoose.models.DownloadHistory ||
  mongoose.model<IDownloadHistoryDocument>('DownloadHistory', DownloadHistorySchema);

export default DownloadHistoryModel;
