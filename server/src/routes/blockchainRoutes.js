import { Router } from "express";
import {
  mintBlockchainNFT,
  storeBlockchainProof,
  verifyBlockchainNFT,
  verifyBlockchainProof,
} from "../controllers/blockchainController.js";

const router = Router();

router.post("/store-proof", storeBlockchainProof);
router.post("/verify-proof", verifyBlockchainProof);
router.post("/mint-nft", mintBlockchainNFT);
router.post("/verify-nft", verifyBlockchainNFT);

export default router;
