// models/document.model.js
import mongoose from "mongoose";
import { IDocs } from "../schemas";

const DocumentSchema = new mongoose.Schema<IDocs>({
  _id: String,
  documentName: {
    type: String,
    default: "Untitled",
  },
  data: Object,
  drawings: {
    type: Array,
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
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