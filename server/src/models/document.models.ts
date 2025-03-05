import mongoose from "mongoose";
import { IDocs } from "../schemas";

const DocumentSchema = new mongoose.Schema<IDocs>(
{
  _id: {
    type: String,
    required: true,
  },
  documentName: {
    type: String,
    default: "Untitled",
  },
  data: Object,
  drawings: {
    type: Array,
    default: [],
  },
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  collaborators: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      status: {
        type: String,
        enum: ["pending", "invited", "accepted", "rejected"],
        default: "pending",
      },
      requestMessage: String,
      requestDate: Date,
      acceptedDate: Date,
    },
  ],
},
{
  timestamps: true,
}
);

// Convert document object to JSON schema
DocumentSchema.set("toJSON", {
transform: function (doc, ret) {
  // Ensure drawings are properly formatted as an array of objects
  if (!ret.drawings) {
    ret.drawings = [];
  }
  return ret;
},
});
// Convert document object to JSON schema
DocumentSchema.set('toJSON', {
transform: function(doc, ret) {
  // Ensure drawings are properly formatted as an array of objects
  if (!ret.drawings) {
    ret.drawings = [];
  }
  return ret;
}
});

const Document = mongoose.model<IDocs>("Document", DocumentSchema);

export default Document;