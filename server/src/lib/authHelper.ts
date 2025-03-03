import { Response } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../schemas";

export const generateJsonWebToken = (user: IUser) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET!, {
    expiresIn: "1d",
  });
};

export const sendTokenResponse = (
  statusCode: number,
  res: Response,
  user: IUser
) => {
  const token = generateJsonWebToken(user);
  return res
    .cookie("token", token, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    })
    .status(statusCode)
    .json({
      success: true,
      message: "User signed in successfully",
      user,
    });
};

export const generateVerificationToken = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

export function formatPhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/\+/g, "");
}
