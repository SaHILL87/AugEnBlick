import mongoose from "mongoose";
import { config } from 'dotenv'


config({
    path:".env"
})

export const connectDb = async () => {
   try {
    await mongoose.connect(process.env.MONGODB_URI as string)
    console.log("Connected to database")
   } catch (error) {
    console.error("Error connecting to database",error)
   }
}