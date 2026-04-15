import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITodoCategory extends Document {
  userId: Types.ObjectId;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  scope: "permanent" | "everyday" | "weekly" | "date";
  weekdays: number[]; // [0-6] for weekly scope
  specificDate: Date | null; // for date scope
  effectiveFrom: Date; // only apply on/after this date
  createdAt: Date;
  updatedAt: Date;
}

const TodoCategorySchema = new Schema<ITodoCategory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true, default: "#6366f1" },
    order: { type: Number, required: true, default: 0 },
    isDefault: { type: Boolean, default: false },
    scope: {
      type: String,
      enum: ["permanent", "everyday", "weekly", "date"],
      default: "permanent",
    },
    weekdays: { type: [Number], default: [] },
    specificDate: { type: Date, default: null },
    effectiveFrom: { type: Date, default: () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; } },
  },
  { timestamps: true }
);

TodoCategorySchema.index({ userId: 1, name: 1 }, { unique: true });

const TodoCategory: Model<ITodoCategory> =
  mongoose.models.TodoCategory ||
  mongoose.model<ITodoCategory>("TodoCategory", TodoCategorySchema);

export default TodoCategory;
