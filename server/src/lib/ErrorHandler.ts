import { NextFunction, Request, Response } from "express";

export class ErrorHandler extends Error{
    constructor(public statusCode:number,public message:string,){
        super(message);
        this.statusCode = statusCode
    }
}

export const errorMiddleware = (err:ErrorHandler,req:Request,res:Response,next:NextFunction)=>{
    err.message ||= "Internal Server Error";
    err.statusCode ||=500
    
    res.status(err.statusCode).json({
        success:false,
        message :err.message
    })
}