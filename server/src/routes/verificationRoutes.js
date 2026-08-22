import { Router } from "express";
import { analyzeVerificationContent } from "../controllers/verificationController.js";

const router = Router();

router.post("/analyze", analyzeVerificationContent);

export default router;
