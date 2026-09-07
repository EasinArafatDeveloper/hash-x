import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRecordDocument extends Document {
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
  location: string;
  area: string;
  address: string;
  orderAmount?: number;
  orderCount?: number;
  status: string;
  lastActive: Date;
  activeDays: number;
  avatarType: string;
  avatarUrl?: string;
  avatarBase64?: string;
  avatarOriginalUrl?: string;
  tags?: string[];
  category?: string;
  customFields?: Map<string, any>;
  datasetId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecordSchema: Schema = new Schema(
  {
    name: { type: String, default: 'Unnamed Record', index: true },
    email: { type: String, default: '', index: true },
    phone: { type: String, default: '', index: true },
    age: { type: Number, default: 0, index: true },
    gender: { type: String, default: 'Other', index: true },
    location: { type: String, default: '', index: true },
    area: { type: String, default: '' },
    address: { type: String, default: '' },
    orderAmount: { type: Number, default: 0, index: true },
    orderCount: { type: Number, default: 0, index: true },
    status: { type: String, default: 'Active', index: true },
    lastActive: { type: Date, default: Date.now, index: true },
    activeDays: { type: Number, default: 0, index: true },
    avatarType: { type: String, default: 'With Avatar', index: true },
    avatarUrl: { type: String, default: '' },
    avatarBase64: { type: String, default: '' },
    avatarOriginalUrl: { type: String, default: '' },
    tags: [{ type: String, index: true }],
    category: { type: String, default: '', index: true },
    customFields: { type: Schema.Types.Mixed, default: {} },
    datasetId: { type: String, index: true },
  },
  {
    timestamps: true,
  }
);

// High-speed deduplication and filtering B-Tree indexes
RecordSchema.index({ phone: 1 });
RecordSchema.index({ email: 1 });
RecordSchema.index({ datasetId: 1 });
RecordSchema.index({ tags: 1 });
RecordSchema.index({ category: 1 });
RecordSchema.index({ status: 1 });
RecordSchema.index({ orderAmount: 1 });
RecordSchema.index({ orderCount: 1 });

// Create compound search text index for lightning fast server-side full text searches
RecordSchema.index({
  name: 'text',
  email: 'text',
  phone: 'text',
  location: 'text',
  area: 'text',
  avatarType: 'text',
});

// In development, ensure new schema definitions reload properly
if (process.env.NODE_ENV !== 'production' && mongoose.models.Record) {
  delete mongoose.models.Record;
}

const RecordModel: Model<IRecordDocument> =
  mongoose.models.Record || mongoose.model<IRecordDocument>('Record', RecordSchema);

export default RecordModel;
