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
  deletedAt?: Date | null;
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
    // Soft-delete marker. null/unset = active record. When set, the record
    // is hidden from every normal read path (explorer, export, stats, AI
    // search) but stays recoverable until the TTL index below purges it.
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Recycle bin: permanently purge soft-deleted records 30 days after deletion.
// Only documents with an actual Date in deletedAt are affected — active
// records (deletedAt: null) are never touched by this index.
RecordSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { deletedAt: { $type: 'date' } } }
);

// ------------------------------------------------------------------
// Soft-delete enforcement — every normal query on this model (explorer,
// export, stats, AI search, dedup lookups, etc.) automatically excludes
// trashed records, without each of the ~40 call sites across the API
// needing to remember to add `deletedAt: null` themselves. Code that
// genuinely needs to see trashed records (the trash-list/restore
// endpoints) opts in explicitly with `.setOptions({ includeSoftDeleted: true })`
// on a query, or `{ includeSoftDeleted: true }` as the aggregate options.
// A caller that explicitly filters on `deletedAt` itself is left alone.
// ------------------------------------------------------------------
function excludeSoftDeleted(this: any) {
  const opts = typeof this.getOptions === 'function' ? this.getOptions() : {};
  if (opts && opts.includeSoftDeleted) return;
  const filter = typeof this.getFilter === 'function' ? this.getFilter() : this.getQuery();
  if (filter && filter.deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
}

RecordSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'countDocuments'], excludeSoftDeleted);

RecordSchema.pre('aggregate', function (this: any) {
  const opts = this.options || {};
  if (opts.includeSoftDeleted) return;
  const pipeline = this.pipeline();
  const alreadyFiltersDeletedAt = pipeline.some(
    (stage: any) => stage && stage.$match && Object.prototype.hasOwnProperty.call(stage.$match, 'deletedAt')
  );
  if (!alreadyFiltersDeletedAt) {
    pipeline.unshift({ $match: { deletedAt: null } });
  }
});

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
