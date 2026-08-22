import { Router } from "express";
import {
  storeBlockchainProof,
  verifyBlockchainProof,
} from "../controllers/blockchainController.js";

const router = Router();

router.post("/store-proof", storeBlockchainProof);
router.post("/verify-proof", verifyBlockchainProof);

export default router;
