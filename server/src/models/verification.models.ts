import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

const Verification =
  mongoose.models.Verification ||
  mongoose.model("Verification", verificationSchema);

export default Verification;
