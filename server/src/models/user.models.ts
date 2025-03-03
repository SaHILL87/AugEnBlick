import mongoose, { Schema, model } from "mongoose";
import { IUser } from "../schemas";

const userSchema = new Schema<IUser>({
  username: { type: String },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["user", "student", "professional"],
    default: "user",
    required: true,
  },
  isVerified: { type: Boolean, default: false },
  aadharPhoto: { type: String },
  isAadharVerified: { type: Boolean, default: false },
  phone: { type: String },
  avatar: { type: String },
  aiChatSessions: { type: [String], default: [] },
  lawyerChatSessions: { type: [String], default: [] },
  isOnline: { type: Boolean, default: false },
  lastOnline: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const User = model<IUser>("User", userSchema);
