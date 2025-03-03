
import { NextFunction,Request,Response } from "express";
type funcType = (req:Request,res:Response,next:NextFunction)=>Promise<any>;
export const TryCatch = (func:funcType)=>(req:Request,res:Response,next:NextFunction)=>{
    return Promise.resolve(func(req,res,next)).catch(next)
}