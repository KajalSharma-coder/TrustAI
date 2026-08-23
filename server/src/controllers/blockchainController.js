import {
  getBlockchainDiagnostics,
  mintContentNFT,
  storeProof,
  verifyContentNFT,
  verifyProof,
} from "../services/blockchainService.js";
import { createIntegrityResult } from "../utils/integrity.js";

function logBlockchainError(action, error) {
  console.error(`[Blockchain] ${action} failed`, {
    message: error.message,
    code: error.code,
    reason: error.reason,
    stage: error.stage,
    details: error.details,
  });
}

function getDeveloperErrorMessage(error) {
  const stage = error.stage ? ` during ${error.stage}` : "";
  const details = error.details || {};
  const reason =
    details.reason ||
    details.shortMessage ||
    error.reason ||
    error.shortMessage ||
    error.message;

  return `NFT minting failed${stage}: ${reason || "Unknown blockchain error"}`;
}

function isBytes32Hash(contentHash) {
  if (typeof contentHash !== "string") {
    return false;
  }

  const normalized = contentHash.trim();
  const withoutPrefix = normalized.startsWith("0x")
    ? normalized.slice(2)
    : normalized;

  return (
    /^[a-fA-F0-9]{64}$/.test(withoutPrefix) &&
    !/^0{64}$/.test(withoutPrefix)
  );
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

export async function mintBlockchainNFT(req, res) {
  const { contentHash } = req.body;

  if (!contentHash || typeof contentHash !== "string") {
    return res.status(400).json({
      success: false,
      message: "contentHash is required",
    });
  }

  if (!isBytes32Hash(contentHash)) {
    return res.status(400).json({
      success: false,
      message: "contentHash must be a 32-byte hex string",
    });
  }

  try {
    const nft = await mintContentNFT(contentHash);

    return res.json({
      success: true,
      nft,
    });
  } catch (error) {
    logBlockchainError("NFT minting", error);

    if (error.code === "NFT_REQUIRES_VERIFIED_PROOF") {
      return res.status(400).json({
        success: false,
        code: error.code,
        message:
          "NFT minting requires verified blockchain proof for the current content.",
        developerMessage: error.message,
      });
    }

    if (error.code === "NFT_DUPLICATE_CONTENT") {
      return res.status(409).json({
        success: false,
        code: "NFT_DUPLICATE_CONTENT",
        message: "This content has already been tokenized.",
        nft: error.nft,
      });
    }

    return res.status(500).json({
      success: false,
      code: error.code || "NFT_MINT_FAILED",
      message: getDeveloperErrorMessage(error),
      developerMessage: getDeveloperErrorMessage(error),
      details: error.details || null,
    });
  }
}

export async function verifyBlockchainNFT(req, res) {
  const { tokenId } = req.body;

  if (tokenId === undefined || tokenId === null || String(tokenId).trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Token ID is required",
    });
  }

  try {
    const nft = await verifyContentNFT(tokenId);

    return res.json({
      success: true,
      nft,
    });
  } catch (error) {
    logBlockchainError("NFT verification", error);

    if (error.message?.includes("Token ID must be a positive integer")) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid positive Token ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to verify NFT on blockchain. Please try again.",
    });
  }
}

export async function getBlockchainDiagnosticsStatus(req, res) {
  try {
    const diagnostics = await getBlockchainDiagnostics();

    return res.json({
      success: true,
      diagnostics,
    });
  } catch (error) {
    logBlockchainError("Blockchain diagnostics", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to read blockchain diagnostics. Please try again.",
      developerMessage:
        error.message || "Unable to read blockchain diagnostics. Please try again.",
      details: error.details || null,
    });
  }
}
