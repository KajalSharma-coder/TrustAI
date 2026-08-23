import { postJson } from "./apiClient.js";

export async function storeProofOnBlockchain(contentHash) {
  const data = await postJson("/api/blockchain/store-proof", { contentHash });

  if (!data?.proof) {
    throw new Error("Unable to store proof on blockchain. Please try again.");
  }

  return data.proof;
}

export async function verifyProofOnBlockchain(contentHash, originalHash) {
  const data = await postJson("/api/blockchain/verify-proof", {
    contentHash,
    originalHash,
  });

  if (typeof data?.exists !== "boolean") {
    throw new Error("Unable to verify blockchain proof. Please try again.");
  }

  return data;
}

export async function mintContentAsNFT(contentHash) {
  let data;

  try {
    data = await postJson("/api/blockchain/mint-nft", { contentHash });
  } catch (error) {
    console.error("[NFT Mint] Mint request failed", {
      message: error.message,
      response: error.data,
    });

    if (error.data?.code === "NFT_DUPLICATE_CONTENT") {
      error.nft = error.data.nft;
    }

    throw error;
  }

  if (!data?.success || !data?.nft?.tokenId || !data?.nft?.contractAddress) {
    throw new Error("Unable to mint NFT on blockchain. Please try again.");
  }

  console.log("[NFT Mint] Mint request succeeded", {
    contractAddress: data.nft.contractAddress,
    chainId: data.nft.chainId,
    walletAddress: data.nft.creator,
    mintFunction: "mintContent",
    mintArguments: [contentHash],
    transactionHash: data.nft.transactionHash,
    receiptStatus: data.nft.receiptStatus,
  });

  return data.nft;
}

export async function verifyContentNFT(tokenId) {
  const data = await postJson("/api/blockchain/verify-nft", { tokenId });

  if (!data?.success || !data?.nft) {
    throw new Error("Unable to verify NFT on blockchain. Please try again.");
  }

  return data.nft;
}
