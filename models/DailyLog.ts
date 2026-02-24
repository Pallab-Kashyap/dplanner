import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IDailyLog extends Document {
  userId: Types.ObjectId;
  date: Date;
  totalTasks: number;
  completedTasks: number;
  partialTasks: number;
  failedTasks: number;
  completionRate: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

const DailyLogSchema = new Schema<IDailyLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    partialTasks: { type: Number, default: 0 },
    failedTasks: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

DailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyLog: Model<IDailyLog> =
  mongoose.models.DailyLog || mongoose.model<IDailyLog>("DailyLog", DailyLogSchema);

export default DailyLog;
