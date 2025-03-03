import mongoose, { Schema, model } from "mongoose";
import { IUser } from "../schemas";

const userSchema = new Schema<IUser>({
  email: { type: String, required: true },
  password: { type: String },
  googleId: { type: String },
  docs: [{ type: Schema.Types.ObjectId, ref: "Document" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const User = model<IUser>("User", userSchema);
