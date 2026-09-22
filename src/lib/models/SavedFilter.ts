import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISavedFilterDocument extends Document {
  name: string;
  filters: Schema.Types.Mixed;
  userId?: string;
  createdBy?: string;
  createdAt: Date;
}

const SavedFilterSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    filters: { type: Schema.Types.Mixed, required: true },
    userId: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

const SavedFilterModel: Model<ISavedFilterDocument> =
  mongoose.models.SavedFilter || mongoose.model<ISavedFilterDocument>('SavedFilter', SavedFilterSchema);

export default SavedFilterModel;
