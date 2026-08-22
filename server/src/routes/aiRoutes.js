import { Router } from "express";
import { generateAiContent } from "../controllers/aiController.js";

const router = Router();

router.post("/generate", generateAiContent);

export default router;
