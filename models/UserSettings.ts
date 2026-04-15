import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IUserSettings extends Document {
  userId: Types.ObjectId;
  theme: "light" | "dark";
  schedulePriority: "custom" | "everyday";
  todoPriority: "custom" | "everyday";
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    schedulePriority: { type: String, enum: ["custom", "everyday"], default: "custom" },
    todoPriority: { type: String, enum: ["custom", "everyday"], default: "custom" },
  },
  { timestamps: true }
);

const UserSettings: Model<IUserSettings> =
  mongoose.models.UserSettings ||
  mongoose.model<IUserSettings>("UserSettings", UserSettingsSchema);

export default UserSettings;
