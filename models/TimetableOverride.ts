import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { ITimeSlot, TimeSlotSchema } from "./TimetableTemplate";

export interface ITimetableOverride extends Document {
  userId: Types.ObjectId;
  date: Date;
  slots: ITimeSlot[];
  createdAt: Date;
  updatedAt: Date;
}

const TimetableOverrideSchema = new Schema<ITimetableOverride>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    slots: [TimeSlotSchema],
  },
  { timestamps: true }
);

TimetableOverrideSchema.index({ userId: 1, date: 1 }, { unique: true });

const TimetableOverride: Model<ITimetableOverride> =
  mongoose.models.TimetableOverride ||
  mongoose.model<ITimetableOverride>("TimetableOverride", TimetableOverrideSchema);

export default TimetableOverride;
