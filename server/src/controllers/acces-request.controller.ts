import { JwtPayload } from "jsonwebtoken";
import { ErrorHandler } from "../lib/ErrorHandler";
import { TryCatch } from "../lib/TryCatch";
import AccessRequest from "../models/access-request.models";
import Document from "../models/document.models";
import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../models/user.models";
import { requestEmail, sendAccessRequestEmail } from "../lib/email";

dotenv.config({
    path: ".env",
});


export const createAccessRequest = TryCatch(
    async (req, res, next) => {

        const { documentId,requestMessage ,token } = req.body;

        if(!token){
            return next(new ErrorHandler(400,"Invalid Request"));
        }

        const doc = await Document.findById(documentId);

        if (!doc) {
            return next(new ErrorHandler(404, "Document not found"));
        }

        const { id: requesterId } = jsonwebtoken.verify(token, process.env.JWT_SECRET || "") as JwtPayload;

        const request = await AccessRequest.findOne({
            documentId,
            userId:requesterId,
            status: "pending"
        })
        const user = await User.findById(requesterId);

        if(!user){
            return next(new ErrorHandler(404, "User not found"));
        }
        console.log("user", user);

        if (request) {
            return next(new ErrorHandler(400, "Request already exists"));
        }


        const documentOwner = doc.owner;


        const accessRequest = await AccessRequest.create({ documentId, requestMessage, documentOwner , userId:requesterId ,email: user.email});

        const requestAcceptionLink = `${process.env.CORS_ORIGIN}/access-request/${accessRequest._id}`;

        await requestEmail(user.email, user.email, requestMessage, String(doc._id), doc.documentName,requestAcceptionLink);

        res.status(201).json({
            success: true,
            data: accessRequest,
        });
    }
);

export const acceptOrRejectRequest = TryCatch(
    async (req, res, next) => {
        const { status, token,id} = req.body;

        console.log("id", id);

        const request:any = await AccessRequest.findById(id).populate("userId");

        console.log("request", request);


        if (!request) {
            return next(new ErrorHandler(404, "Request not found"));
        }

        const { id: userId } = jsonwebtoken.verify(token, process.env.JWT_SECRET || "") as JwtPayload;

        if (request.documentOwner.toString() !== userId) {
            return next(new ErrorHandler(403, "Unauthorized"));
        }

        request.status = status;
        await request.save();

        const doc = await Document
            .findById(request.documentId);

        doc?.collaborators.push(request.userId);
        await doc?.save();

        if (!doc) {
            return next(new ErrorHandler(404, "Document not found"));
        }

        await sendAccessRequestEmail(request.userId.email, String(request.documentId),doc.documentName, status);

        res.status(200).json({
            success: true,
            data: request,
        });

    }
);


export const getRequestById = TryCatch(
    async (req, res, next) => {
        const { id } = req.params;

        const request = await AccessRequest.findById(id);

        if (!request) {
            return next(new ErrorHandler(404, "Request not found"));
        }

        res.status(200).json({
            success: true,
            data: request,
        });
    } 
);