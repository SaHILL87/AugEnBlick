// models/document.model.js
import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema({
  _id: String,
  documentName: {
    type: String,
    default: "Untitled",
  },
  data: Object,
  drawings: {
    type: Array,
    default: [],
  }
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

const Document = mongoose.model("Document", DocumentSchema);

export default Document;