import express from "express";
import {
   getDocumentMetadata,
  getMyDetails,
  isCollaborator,
  loginUser,
  registerUser,
  updateDocumentTitle,
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
router.post("/isContributor", isCollaborator);
router.post("/username", authenticate, updateUsername);
router.put("/:documentId/title", updateDocumentTitle);
router.get("/:documentId",  getDocumentMetadata);


export { router as userRoutes };
