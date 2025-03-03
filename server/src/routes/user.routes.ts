import express from "express";
import {
   getMyDetails,
   loginUser,
   registerUser,
   updateUsername,
   verifyUser,
} from "../controllers/user.controller";
import { upload } from "../lib/multer";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

router.post("/sign-up", upload.single("avatar"), registerUser);
router.post("/verify", verifyUser);
router.post("/login", loginUser);
router.get("/me", getMyDetails);
router.post("/username", authenticate, updateUsername);

export { router as userRoutes };
