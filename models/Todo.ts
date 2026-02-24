import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type TodoStatus = "pending" | "partial" | "completed" | "failed";

export interface ITodo extends Document {
  userId: Types.ObjectId;
  title: string;
  description: string;
  category: Types.ObjectId;
  status: TodoStatus;
  statusNote: string;
  tags: Types.ObjectId[];
  date: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const TodoSchema = new Schema<ITodo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: Schema.Types.ObjectId, ref: "TodoCategory", required: true },
    status: {
      type: String,
      enum: ["pending", "partial", "completed", "failed"],
      default: "pending",
    },
    statusNote: { type: String, default: "" },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    date: { type: Date, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TodoSchema.index({ date: 1, category: 1 });

const Todo: Model<ITodo> = mongoose.models.Todo || mongoose.model<ITodo>("Todo", TodoSchema);

export default Todo;
