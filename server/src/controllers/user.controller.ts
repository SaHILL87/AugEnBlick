import { ErrorHandler } from "../lib/ErrorHandler";
import { TryCatch } from "../lib/TryCatch";
import { Request, Response, NextFunction } from "express";
import { User } from "../models/user.models";
import {
  formatPhoneNumber,
  generateVerificationToken,
  sendTokenResponse,
} from "../lib/authHelper";
import Verification from "../models/verification.models";
import { sendVerification } from "../lib/email";
import bcrypt from "bcrypt";
import { uploadOnCloudinary } from "../lib/cloudinary";
import Document from "../models/document.models";
import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import { Schema, SchemaTypes, Types } from "mongoose";

export const registerUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) return next(new ErrorHandler(400, "User already exists"));

    const hashedPassword = await bcrypt.hash(password, 10);

    user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const verificationCode = generateVerificationToken();

    await Verification.create({
      user: user._id,
      code: verificationCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
    });

    await sendVerification(email, verificationCode);

    return res.status(201).json({
      success: true,
      message: "User created and verification code sent to email",
      user,
    });
  }
);

export const loginUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    let user;

    user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorHandler(400, "Invalid credentials"));
    }

    if (!user.isVerified) {
      const verificationCode = generateVerificationToken();

      const existingVerification = await Verification.findOne({ user: user._id });

      if (existingVerification) {
        await existingVerification.deleteOne({ user: user._id });
      }

      await Verification.create({
        user: user._id,
        code: verificationCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      //   await sendWhatsapp(String(verificationCode), user.phone);

      await sendVerification(email, verificationCode);

      return res.status(200).json({
        success: true,
        message: "Verification code sent to email and whatsapp",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password!);

    if (!isPasswordMatch) {
      return next(new ErrorHandler(400, "Invalid credentials"));
    }

    sendTokenResponse(200, res, user!);
  }
);
export const logoutUser = TryCatch(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export const verifyUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, verificationCode } = req.body;

    let user = await User.findOne({
      email,
    });

    if (!user) {
      return next(new ErrorHandler(404, "User not found"));
    }

    const userVerificationCode = await Verification.findOne({
      user: user._id,
    });

    if (!userVerificationCode) {
      return next(new ErrorHandler(400, "Verification code expired"));
    }

    console.log(userVerificationCode.code, verificationCode);

    if (Number(userVerificationCode.code) !== Number(verificationCode)) {
      return next(new ErrorHandler(400, "Invalid verification code"));
    }

    user = await User.findOneAndUpdate(
      { email },
      { $set: { isVerified: true } },
      { new: true }
    );

    if (!user) {
      return next(new ErrorHandler(400, "User not found"));
    }

    await userVerificationCode.deleteOne({ user: user._id });

    sendTokenResponse(200, res, user);
  }
);

export const sendVerificationCode = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, phone } = req.body;

    const verificationCode = generateVerificationToken();

    await Verification.create({
      user: email,
      code: verificationCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendVerification(email, verificationCode);

    return res.status(200).json({
      success: true,
      message: "Verification code sent to email and whatsapp",
    });
  }
);

export const getMyDetails = TryCatch(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  res.status(200).json({ success: true, user });
});

export const updateUsername = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { username },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Username updated successfully",
      updatedUser,
    });
  }
);


export const isCollaborator = TryCatch(async(req,res,next)=>{
    const { documentId , token } = req.body ;
    const { id: userId } = jsonwebtoken.verify(token, process.env.JWT_SECRET || "") as JwtPayload;

    const document = await Document.findById(documentId) ;

    const userIdQuery = Types.ObjectId.isValid(userId) ? new Schema.Types.ObjectId(userId) : userId;
    const documentIdQuery = Types.ObjectId.isValid(documentId) ? new Schema.Types.ObjectId(documentId) : documentId;

    console.log(userIdQuery,documentIdQuery);

    const doc = await Document.findById(documentIdQuery).populate("collaborators.userId", "username email");
    console.log(doc);

    if(!doc){
        return res.status(404).json({message:"Document not found"});
    }

    if(doc.owner.toString() === userId){
        return res.status(200).json({
            isAccessible: true,
            isCollaborator: false,
            isOwner: true

        });
    }

    let isAccessible = false

    doc.collaborators.forEach((collaborator:any)=>{
      if(collaborator._id.toString()===userId){
        isAccessible = true;
      }

    })

  
        return res.status(200).json({
            isAccessible: isAccessible,
            isCollaborator: false,
            isOwner: false
        });
    
})
