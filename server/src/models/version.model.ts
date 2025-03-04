import mongoose from 'mongoose';
import { IDocVersion } from '../schemas';


const versionSchema = new mongoose.Schema<IDocVersion>({
    documentId: {
        type: String,
        ref: 'Document',
        required: true
    },
    data: Object,
    drawings: {
        type: Array,
        default: []
    },
    name:{
        type: String,
        required: true
    }
}, {
    timestamps: true
})



const DocVersion = mongoose.model<IDocVersion>('DocVersion', versionSchema);


export default DocVersion