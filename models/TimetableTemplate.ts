import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type SlotStatus = "pending" | "partial" | "completed" | "failed";

export interface ITimeSlot {
  _id?: Types.ObjectId;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  title: string;
  description: string;
  tags: Types.ObjectId[];
  status: SlotStatus;
  statusNote: string;
}

export interface ITimetableTemplate extends Document {
  userId: Types.ObjectId;
  dayOfWeek: number; // 0=Sun, 1=Mon ... 6=Sat
  slots: ITimeSlot[];
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotSchema = new Schema<ITimeSlot>(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    status: {
      type: String,
      enum: ["pending", "partial", "completed", "failed"],
      default: "pending",
    },
    statusNote: { type: String, default: "" },
  },
  { _id: true }
);

const TimetableTemplateSchema = new Schema<ITimetableTemplate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    slots: [TimeSlotSchema],
  },
  { timestamps: true }
);

TimetableTemplateSchema.index({ userId: 1, dayOfWeek: 1 }, { unique: true });

const TimetableTemplate: Model<ITimetableTemplate> =
  mongoose.models.TimetableTemplate ||
  mongoose.model<ITimetableTemplate>("TimetableTemplate", TimetableTemplateSchema);

export default TimetableTemplate;
export { TimeSlotSchema };
