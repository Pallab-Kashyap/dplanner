import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITag extends Document {
  userId: Types.ObjectId;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true, default: "#6366f1" },
  },
  { timestamps: true }
);

TagSchema.index({ userId: 1, name: 1 }, { unique: true });

const Tag: Model<ITag> = mongoose.models.Tag || mongoose.model<ITag>("Tag", TagSchema);


export default Tag;
