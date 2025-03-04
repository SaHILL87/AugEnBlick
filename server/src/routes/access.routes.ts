import express from 'express';
import { acceptOrRejectRequest, createAccessRequest, getRequestById } from '../controllers/acces-request.controller';

const router = express.Router();


router.post("/request-access",createAccessRequest);
router.post("/access-status",acceptOrRejectRequest);
router.get("/access-request/:id",getRequestById);



export { router as accessRouter };