import mongoose, {Document,Schema} from "mongoose";

export interface IUser extends Document {
    _id: Schema.Types.ObjectId;
    name: string;
    email: string;
    password?: string;
    googleId?: string;
    docs: Array<Schema.Types.ObjectId>;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IDocs extends Document {
    _id: Schema.Types.ObjectId;
    documentName: string;
    data: object;
    drawings: any;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Schema.Types.ObjectId;
    collaborators: Array<Schema.Types.ObjectId>;
    owner: Schema.Types.ObjectId;
}

