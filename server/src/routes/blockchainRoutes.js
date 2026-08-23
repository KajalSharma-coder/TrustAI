import { Router } from "express";
import {
  getBlockchainDiagnosticsStatus,
  mintBlockchainNFT,
  storeBlockchainProof,
  verifyBlockchainNFT,
  verifyBlockchainProof,
} from "../controllers/blockchainController.js";

const router = Router();

router.get("/diagnostics", getBlockchainDiagnosticsStatus);
router.post("/store-proof", storeBlockchainProof);
router.post("/verify-proof", verifyBlockchainProof);
router.post("/mint-nft", mintBlockchainNFT);
router.post("/verify-nft", verifyBlockchainNFT);

export default router;
