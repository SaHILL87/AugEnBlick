import mongoose, {Document,Schema} from "mongoose";

export interface IUser extends Document {
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
    documentName: string;
    data: object;
    drawings: any;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Schema.Types.ObjectId;
}