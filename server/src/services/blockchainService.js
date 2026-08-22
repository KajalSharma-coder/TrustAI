import {
  Contract,
  Interface,
  JsonRpcProvider,
  Wallet,
  id,
  isAddress,
} from "ethers";
import crypto from "crypto";

const TRUSTAI_PROOF_ABI = [
  "function storeProof(bytes32 contentHash) external",
  "function verifyProof(bytes32 contentHash) external view returns (bool)",
];
const REQUIRED_TRUSTAI_PROOF_FUNCTIONS = [
  "storeProof(bytes32)",
  "verifyProof(bytes32)",
];

let contract;
let contractVerificationPromise;
const mockProofs = new Map();

function requireEnv(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`${name} is not configured`);
  }

  return value.trim();
}

function getOptionalEnv(name) {
  const value = process.env[name]?.trim();

  if (
    !value ||
    value === "your_rpc_url_here" ||
    value === "your_private_key_here" ||
    value === "your_contract_address_here"
  ) {
    return "";
  }

  return value;
}

function normalizePrivateKey(privateKey) {
  const withoutPrefix = privateKey.startsWith("0x")
    ? privateKey.slice(2)
    : privateKey;

  if (!/^[a-fA-F0-9]{64}$/.test(withoutPrefix)) {
    throw new Error("BLOCKCHAIN_PRIVATE_KEY is invalid");
  }

  return `0x${withoutPrefix}`;
}

function normalizeContentHash(contentHash) {
  if (typeof contentHash !== "string") {
    throw new Error("contentHash must be a SHA-256 hex string");
  }

  const normalized = contentHash.trim();
  const withoutPrefix = normalized.startsWith("0x")
    ? normalized.slice(2)
    : normalized;

  if (!/^[a-fA-F0-9]{64}$/.test(withoutPrefix)) {
    throw new Error("contentHash must be a 32-byte SHA-256 hex string");
  }

  return `0x${withoutPrefix.toLowerCase()}`;
}

function getTrustAIProofContract() {
  if (contract) {
    return contract;
  }

  const rpcUrl = requireEnv("BLOCKCHAIN_RPC_URL");
  const privateKey = normalizePrivateKey(requireEnv("BLOCKCHAIN_PRIVATE_KEY"));
  const contractAddress = requireEnv("TRUSTAI_PROOF_CONTRACT_ADDRESS");

  if (!isAddress(contractAddress)) {
    throw new Error("TRUSTAI_PROOF_CONTRACT_ADDRESS is invalid");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  contract = new Contract(contractAddress, TRUSTAI_PROOF_ABI, wallet);
  return contract;
}

function verifyTrustAIProofAbi() {
  const contractInterface = new Interface(TRUSTAI_PROOF_ABI);

  for (const functionSignature of REQUIRED_TRUSTAI_PROOF_FUNCTIONS) {
    const fragment = contractInterface.getFunction(functionSignature);
    const expectedSelector = id(functionSignature).slice(0, 10);

    if (!fragment || fragment.selector !== expectedSelector) {
      throw new Error(`TrustAIProof ABI mismatch for ${functionSignature}`);
    }
  }
}

async function verifyDeployedTrustAIProofContract(trustAIProof) {
  verifyTrustAIProofAbi();

  const provider = trustAIProof.runner?.provider;

  if (!provider) {
    throw new Error("Blockchain provider is not configured");
  }

  const contractAddress = await trustAIProof.getAddress();
  const deployedBytecode = await provider.getCode(contractAddress);

  if (!deployedBytecode || deployedBytecode === "0x") {
    throw new Error("TRUSTAI_PROOF_CONTRACT_ADDRESS has no deployed bytecode");
  }

  const normalizedBytecode = deployedBytecode.toLowerCase();

  for (const functionSignature of REQUIRED_TRUSTAI_PROOF_FUNCTIONS) {
    const selector = id(functionSignature).slice(2, 10).toLowerCase();

    if (!normalizedBytecode.includes(selector)) {
      throw new Error(
        `TrustAIProof deployed bytecode does not include ${functionSignature}`
      );
    }
  }
}

async function getVerifiedTrustAIProofContract() {
  const trustAIProof = getTrustAIProofContract();

  if (!contractVerificationPromise) {
    contractVerificationPromise = verifyDeployedTrustAIProofContract(
      trustAIProof
    ).catch((error) => {
      contractVerificationPromise = undefined;
      throw error;
    });
  }

  await contractVerificationPromise;

  return trustAIProof;
}

function getBlockchainConfigStatus() {
  const rpcUrl = getOptionalEnv("BLOCKCHAIN_RPC_URL");
  const privateKey = getOptionalEnv("BLOCKCHAIN_PRIVATE_KEY");
  const contractAddress = getOptionalEnv("TRUSTAI_PROOF_CONTRACT_ADDRESS");

  return {
    isConfigured: Boolean(rpcUrl && privateKey && contractAddress),
    rpcUrlConfigured: Boolean(rpcUrl),
    privateKeyConfigured: Boolean(privateKey),
    contractAddressConfigured: Boolean(contractAddress),
  };
}

function createMockTransactionHash(contentHash, timestamp) {
  return `0x${crypto
    .createHash("sha256")
    .update(`${contentHash}:${timestamp}`)
    .digest("hex")}`;
}

function storeMockProof(contentHash) {
  const existingProof = mockProofs.get(contentHash);

  if (existingProof) {
    return existingProof;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const proof = {
    contentHash,
    transactionHash: createMockTransactionHash(contentHash, timestamp),
    blockNumber: null,
    timestamp,
    storage: "mock",
  };

  mockProofs.set(contentHash, proof);
  return proof;
}

export async function storeProof(contentHash) {
  const normalizedHash = normalizeContentHash(contentHash);
  const configStatus = getBlockchainConfigStatus();

  if (!configStatus.isConfigured) {
    console.warn(
      "[Blockchain] Using mock proof storage because blockchain environment variables are not fully configured",
      configStatus
    );

    return storeMockProof(normalizedHash);
  }

  const trustAIProof = await getVerifiedTrustAIProofContract();
  const transaction = await trustAIProof.storeProof(normalizedHash);
  const receipt = await transaction.wait();
  const block = await trustAIProof.runner.provider.getBlock(receipt.blockNumber);

  return {
    contentHash: normalizedHash,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    timestamp: block?.timestamp ? Number(block.timestamp) : null,
    storage: "blockchain",
  };
}

export async function verifyProof(contentHash) {
  const normalizedHash = normalizeContentHash(contentHash);
  const configStatus = getBlockchainConfigStatus();

  if (!configStatus.isConfigured) {
    return mockProofs.has(normalizedHash);
  }

  const trustAIProof = await getVerifiedTrustAIProofContract();

  return trustAIProof.verifyProof(normalizedHash);
}
