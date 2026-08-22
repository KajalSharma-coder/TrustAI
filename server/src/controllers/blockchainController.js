import { storeProof, verifyProof } from "../services/blockchainService.js";
import { createIntegrityResult } from "../utils/integrity.js";

function logBlockchainError(action, error) {
  console.error(`[Blockchain] ${action} failed`, {
    message: error.message,
    code: error.code,
    reason: error.reason,
  });
}

export async function storeBlockchainProof(req, res) {
  const { contentHash } = req.body;

  if (!contentHash || typeof contentHash !== "string") {
    return res.status(400).json({
      success: false,
      message: "contentHash is required",
    });
  }

  try {
    const proof = await storeProof(contentHash);

    return res.json({
      success: true,
      proof,
    });
  } catch (error) {
    logBlockchainError("Proof storage", error);

    return res.status(500).json({
      success: false,
      message: "Unable to store proof on blockchain. Please try again.",
    });
  }
}

export async function verifyBlockchainProof(req, res) {
  const { contentHash, originalHash } = req.body;

  if (!contentHash || typeof contentHash !== "string") {
    return res.status(400).json({
      success: false,
      message: "contentHash is required",
    });
  }

  try {
    const exists = await verifyProof(contentHash);

    return res.json({
      success: true,
      exists,
      integrity: createIntegrityResult(contentHash, originalHash),
    });
  } catch (error) {
    logBlockchainError("Proof verification", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify blockchain proof. Please try again.",
    });
  }
}
