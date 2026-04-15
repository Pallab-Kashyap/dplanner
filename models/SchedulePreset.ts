import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { ITimeSlot, TimeSlotSchema } from "./TimetableTemplate";

export interface ISchedulePreset extends Document {
  userId: Types.ObjectId;
  name: string;
  scope: "everyday" | "custom";
  weekdays: number[];
  slots: ITimeSlot[];
  isActive: boolean;
  effectiveFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SchedulePresetSchema = new Schema<ISchedulePreset>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    scope: { type: String, enum: ["everyday", "custom"], required: true },
    weekdays: { type: [Number], required: true },
    slots: [TimeSlotSchema],
    isActive: { type: Boolean, default: false },
    effectiveFrom: {
      type: Date,
      default: () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; },
    },
  },
  { timestamps: true }
);

SchedulePresetSchema.index({ userId: 1, scope: 1, isActive: 1 });

const SchedulePreset: Model<ISchedulePreset> =
  mongoose.models.SchedulePreset ||
  mongoose.model<ISchedulePreset>("SchedulePreset", SchedulePresetSchema);

export default SchedulePreset;
