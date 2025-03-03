import mongoose from "mongoose";


export interface IUser {
    username: string;
    name: string;
    email: string;
    password: string;
    isVerified: boolean;
    phone: string;
    avatar: string;
    createdAt: Date;
    updatedAt: Date;
}