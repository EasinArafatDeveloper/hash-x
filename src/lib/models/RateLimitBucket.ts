import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Fixed-window rate-limit counter, one document per (identifier, window)
 * pair. Storing this in MongoDB (rather than an in-process Map) means the
 * limit is correctly shared across every server instance/serverless
 * replica, not just whichever one happened to handle a given request.
 */
export interface IRateLimitBucketDocument extends Omit<Document, '_id'> {
  _id: string;
  count: number;
  expiresAt: Date;
}

const RateLimitBucketSchema: Schema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

RateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.RateLimitBucket) {
  delete mongoose.models.RateLimitBucket;
}

const RateLimitBucketModel: Model<IRateLimitBucketDocument> =
  mongoose.models.RateLimitBucket || mongoose.model<IRateLimitBucketDocument>('RateLimitBucket', RateLimitBucketSchema);

export default RateLimitBucketModel;
