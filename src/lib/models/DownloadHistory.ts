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

const DownloadHistoryModel: Model<IDownloadHistoryDocument> =
  mongoose.models.DownloadHistory ||
  mongoose.model<IDownloadHistoryDocument>('DownloadHistory', DownloadHistorySchema);

export default DownloadHistoryModel;
