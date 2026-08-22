import { Router } from "express";
import {
  generateAiContent,
  verifyAiContent,
} from "../controllers/aiController.js";

const router = Router();

router.post("/generate", generateAiContent);
router.post("/verify", verifyAiContent);

export default router;
