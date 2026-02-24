import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IFeedback extends Document {
  userId: Types.ObjectId;
  suggestion: string;
  rating: number | null; // 0-4 emoji index, null if not selected
  createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    suggestion: { type: String, default: "" },
    rating: { type: Number, default: null },
  },
  { timestamps: true }
);

const Feedback: Model<IFeedback> =
  mongoose.models.Feedback ||
  mongoose.model<IFeedback>("Feedback", FeedbackSchema);

export default Feedback;
