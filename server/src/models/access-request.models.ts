import mongoose from "mongoose";
import { IAccessRequest } from "../schemas";


const accessRequestSchema = new mongoose.Schema<IAccessRequest>({
    documentId: {
        type: String,
        ref: 'Document',
        required: true
    },
    email: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "invited", "accepted", "rejected"],
        default: "pending"
    },
    requestMessage: String,
    requestDate: Date,
    documentOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
})

const AccessRequest = mongoose.model<IAccessRequest>('AccessRequest', accessRequestSchema);

export default AccessRequest

