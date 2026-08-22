import { Router } from "express";
import {
  getDashboardHistory,
  saveDashboardVerification,
  updateDashboardVerification,
} from "../controllers/dashboardController.js";

const router = Router();

router.get("/history", getDashboardHistory);
router.post("/history", saveDashboardVerification);
router.post("/history/:id", updateDashboardVerification);

export default router;
