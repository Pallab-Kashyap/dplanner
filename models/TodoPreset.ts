import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITodoPresetItem {
  _id: Types.ObjectId;
  title: string;
  description: string;
  category: Types.ObjectId;
  tags: Types.ObjectId[];
  order: number;
}

export interface ITodoPreset extends Document {
  userId: Types.ObjectId;
  name: string;
  scope: "everyday" | "custom";
  weekdays: number[];
  items: ITodoPresetItem[];
  isActive: boolean;
  effectiveFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TodoPresetItemSchema = new Schema<ITodoPresetItem>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: Schema.Types.ObjectId, ref: "TodoCategory", required: true },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const TodoPresetSchema = new Schema<ITodoPreset>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    scope: { type: String, enum: ["everyday", "custom"], required: true },
    weekdays: { type: [Number], required: true },
    items: [TodoPresetItemSchema],
    isActive: { type: Boolean, default: false },
    effectiveFrom: {
      type: Date,
      default: () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; },
    },
  },
  { timestamps: true }
);

TodoPresetSchema.index({ userId: 1, scope: 1, isActive: 1 });

const TodoPreset: Model<ITodoPreset> =
  mongoose.models.TodoPreset ||
  mongoose.model<ITodoPreset>("TodoPreset", TodoPresetSchema);

export default TodoPreset;
