import { postJson } from "./apiClient.js";

export async function storeProofOnBlockchain(contentHash) {
  const data = await postJson("/api/blockchain/store-proof", { contentHash });

  if (!data?.proof) {
    throw new Error("Unable to store proof on blockchain. Please try again.");
  }

  return data.proof;
}

export async function verifyProofOnBlockchain(contentHash) {
  const data = await postJson("/api/blockchain/verify-proof", { contentHash });

  if (typeof data?.exists !== "boolean") {
    throw new Error("Unable to verify blockchain proof. Please try again.");
  }

  return data.exists;
}
