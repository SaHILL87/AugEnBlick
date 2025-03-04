import mongoose from 'mongoose';
import { IDocVersion } from '../schemas';


const versionSchema = new mongoose.Schema<IDocVersion>({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    data: Object,
    drawings: {
        type: Array,
        default: []
    }
}, {
    timestamps: true
})



const DocVersion = mongoose.model<IDocVersion>('DocVersion', versionSchema);


export default DocVersion