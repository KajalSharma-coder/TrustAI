import {
  AbiCoder,
  Contract,
  formatEther,
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
const TRUSTAI_NFT_ABI = [
  "function mintContent(bytes32 contentHash) external returns (uint256 tokenId)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function contentHash(uint256 tokenId) external view returns (bytes32)",
  "function timestamp(uint256 tokenId) external view returns (uint256)",
  "function creator(uint256 tokenId) external view returns (address)",
  "event ContentTokenized(uint256 indexed tokenId, bytes32 indexed contentHash, address indexed creator, uint256 timestamp)",
];
const REQUIRED_TRUSTAI_PROOF_FUNCTIONS = [
  "storeProof(bytes32)",
  "verifyProof(bytes32)",
];
const REQUIRED_TRUSTAI_NFT_FUNCTIONS = [
  "mintContent(bytes32)",
  "ownerOf(uint256)",
  "contentHash(uint256)",
  "timestamp(uint256)",
  "creator(uint256)",
];

let contract;
let nftContract;
let contractVerificationPromise;
let nftDeploymentBlockPromise;
const mockProofs = new Map();

const EXPLORER_BASE_URLS_BY_CHAIN_ID = {
  1: "https://etherscan.io",
  5: "https://goerli.etherscan.io",
  11155111: "https://sepolia.etherscan.io",
  17000: "https://holesky.etherscan.io",
  137: "https://polygonscan.com",
  80002: "https://amoy.polygonscan.com",
};
const REVERT_REASON_ABI_CODER = AbiCoder.defaultAbiCoder();
const ERROR_STRING_SELECTOR = "0x08c379a0";
const PANIC_SELECTOR = "0x4e487b71";
const TRUSTAI_NFT_MINT_FUNCTION = "mintContent";
const REQUIRED_CHAIN_ID = 11155111;
const REQUIRED_CHAIN_NAME = "Sepolia";
const NFT_EVENT_QUERY_CHUNK_SIZE = 25_000;
const NFT_EVENT_QUERY_MIN_CHUNK_SIZE = 500;

const PANIC_REASONS = {
  "0x00": "Generic compiler inserted panic",
  "0x01": "Assertion failed",
  "0x11": "Arithmetic overflow or underflow",
  "0x12": "Division or modulo by zero",
  "0x21": "Invalid enum conversion",
  "0x22": "Incorrectly encoded storage byte array",
  "0x31": "pop() on an empty array",
  "0x32": "Array index out of bounds",
  "0x41": "Memory allocation overflow",
  "0x51": "Call to zero-initialized internal function",
};

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

function normalizeTokenId(tokenId) {
  const normalized =
    typeof tokenId === "bigint" ? tokenId.toString() : String(tokenId || "").trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error("Token ID must be a positive integer");
  }

  const tokenIdBigInt = BigInt(normalized);

  if (tokenIdBigInt <= 0n) {
    throw new Error("Token ID must be a positive integer");
  }

  return tokenIdBigInt;
}

function getNestedErrorValue(error, key) {
  let current = error;

  while (current && typeof current === "object") {
    if (current[key]) {
      return current[key];
    }

    current = current.error || current.info?.error;
  }

  return undefined;
}

function getRevertData(error) {
  const candidates = [
    error?.data,
    error?.error?.data,
    error?.info?.error?.data,
    error?.receipt?.revertReason,
    getNestedErrorValue(error, "data"),
  ];

  return candidates.find(
    (candidate) => typeof candidate === "string" && candidate.startsWith("0x")
  );
}

function decodeRevertReason(error) {
  if (error?.reason) {
    return error.reason;
  }

  if (error?.shortMessage) {
    return error.shortMessage;
  }

  const revertData = getRevertData(error);

  if (!revertData || revertData === "0x") {
    return "";
  }

  try {
    if (revertData.startsWith(ERROR_STRING_SELECTOR)) {
      const [reason] = REVERT_REASON_ABI_CODER.decode(
        ["string"],
        `0x${revertData.slice(10)}`
      );
      return reason;
    }

    if (revertData.startsWith(PANIC_SELECTOR)) {
      const [panicCode] = REVERT_REASON_ABI_CODER.decode(
        ["uint256"],
        `0x${revertData.slice(10)}`
      );
      const code = `0x${panicCode.toString(16).padStart(2, "0")}`;
      return `Panic ${code}: ${PANIC_REASONS[code] || "Unknown panic"}`;
    }
  } catch {
    return "";
  }

  return "";
}

function getBlockchainErrorDetails(error) {
  return {
    code: error?.code || "",
    action: error?.action || "",
    reason: decodeRevertReason(error),
    shortMessage: error?.shortMessage || "",
    message: error?.message || "",
    transactionHash: error?.transactionHash || error?.receipt?.hash || "",
    receiptStatus:
      error?.receipt?.status === undefined ? undefined : Number(error.receipt.status),
    revertData: getRevertData(error) || "",
  };
}

function getUserFacingBlockchainError(error) {
  const details = getBlockchainErrorDetails(error);

  return (
    details.reason ||
    details.shortMessage ||
    error?.reason ||
    error?.shortMessage ||
    error?.message ||
    "Unknown blockchain error"
  );
}

function createMintError(error, stage) {
  const details = getBlockchainErrorDetails(error);
  const reason =
    details.reason ||
    details.shortMessage ||
    details.message ||
    String(error || "") ||
    "Unknown blockchain error";
  const mintError = new Error(`NFT minting failed during ${stage}: ${reason}`);

  mintError.code = error?.code || "NFT_MINT_FAILED";
  mintError.stage = stage;
  mintError.details = details;

  return mintError;
}

function logNFTMintDebug(message, details = {}) {
  console.log(`[NFT Mint] ${message}`, details);
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

function getTrustAIContentNFTContract() {
  if (nftContract) {
    return nftContract;
  }

  const rpcUrl = requireEnv("BLOCKCHAIN_RPC_URL");
  const privateKey = normalizePrivateKey(requireEnv("BLOCKCHAIN_PRIVATE_KEY"));
  const contractAddress = requireEnv("TRUSTAI_NFT_CONTRACT_ADDRESS");

  if (!isAddress(contractAddress)) {
    throw new Error("TRUSTAI_NFT_CONTRACT_ADDRESS is invalid");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  nftContract = new Contract(contractAddress, TRUSTAI_NFT_ABI, wallet);
  return nftContract;
}

function verifyTrustAIContentNFTAbi() {
  const contractInterface = new Interface(TRUSTAI_NFT_ABI);

  for (const functionSignature of REQUIRED_TRUSTAI_NFT_FUNCTIONS) {
    const fragment = contractInterface.getFunction(functionSignature);
    const expectedSelector = id(functionSignature).slice(0, 10);

    if (!fragment || fragment.selector !== expectedSelector) {
      throw new Error(`TrustAIContentNFT ABI mismatch for ${functionSignature}`);
    }
  }

  const eventFragment = contractInterface.getEvent("ContentTokenized");

  if (!eventFragment) {
    throw new Error("TrustAIContentNFT ABI mismatch for ContentTokenized event");
  }
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
  const proofContractAddress = getOptionalEnv("TRUSTAI_PROOF_CONTRACT_ADDRESS");
  const nftContractAddress = getOptionalEnv("TRUSTAI_NFT_CONTRACT_ADDRESS");

  return {
    isConfigured: Boolean(
      rpcUrl && privateKey && proofContractAddress && nftContractAddress
    ),
    rpcUrlConfigured: Boolean(rpcUrl),
    privateKeyConfigured: Boolean(privateKey),
    proofContractAddressConfigured: Boolean(proofContractAddress),
    nftContractAddressConfigured: Boolean(nftContractAddress),
  };
}

function getProofBlockchainConfigStatus() {
  const rpcUrl = getOptionalEnv("BLOCKCHAIN_RPC_URL");
  const privateKey = getOptionalEnv("BLOCKCHAIN_PRIVATE_KEY");
  const proofContractAddress = getOptionalEnv("TRUSTAI_PROOF_CONTRACT_ADDRESS");

  return {
    isConfigured: Boolean(rpcUrl && privateKey && proofContractAddress),
    rpcUrlConfigured: Boolean(rpcUrl),
    privateKeyConfigured: Boolean(privateKey),
    proofContractAddressConfigured: Boolean(proofContractAddress),
  };
}

async function getRunnerNetworkContext(contractRunner) {
  const provider = contractRunner?.provider;

  if (!provider) {
    throw new Error("Blockchain provider is not configured");
  }

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  return {
    provider,
    chainId,
    networkName: network.name === "unknown" ? "" : network.name,
  };
}

async function assertSepoliaNetwork(contractRunner) {
  const networkContext = await getRunnerNetworkContext(contractRunner);

  if (networkContext.chainId !== REQUIRED_CHAIN_ID) {
    throw new Error(
      `Backend is connected to chain ID ${networkContext.chainId}, expected ${REQUIRED_CHAIN_ID} (${REQUIRED_CHAIN_NAME}).`
    );
  }

  return networkContext;
}

async function assertDeployedContract(provider, contractAddress, label) {
  const bytecode = await provider.getCode(contractAddress);
  const isDeployed = Boolean(bytecode && bytecode !== "0x");

  if (!isDeployed) {
    throw new Error(`${label} has no deployed bytecode at ${contractAddress}`);
  }

  return {
    isDeployed,
    bytecodeSizeBytes: (bytecode.length - 2) / 2,
  };
}

async function assertWalletCanPayForMint({
  provider,
  walletAddress,
  estimatedGas,
}) {
  const [balance, feeData] = await Promise.all([
    provider.getBalance(walletAddress),
    provider.getFeeData(),
  ]);
  const gasPrice = feeData.maxFeePerGas || feeData.gasPrice;

  if (!gasPrice) {
    return {
      balance,
      balanceEth: formatEther(balance),
      gasPrice: null,
      estimatedCost: null,
      estimatedCostEth: "",
      hasSufficientEth: balance > 0n,
    };
  }

  const estimatedCost = estimatedGas * gasPrice;
  const hasSufficientEth = balance >= estimatedCost;

  if (!hasSufficientEth) {
    throw new Error(
      `Wallet has insufficient Sepolia ETH. Balance ${formatEther(
        balance
      )} ETH, estimated mint cost ${formatEther(estimatedCost)} ETH.`
    );
  }

  return {
    balance,
    balanceEth: formatEther(balance),
    gasPrice,
    estimatedCost,
    estimatedCostEth: formatEther(estimatedCost),
    hasSufficientEth,
  };
}

async function getExplorerContext(contractRunner) {
  const provider = contractRunner?.provider;

  if (!provider) {
    return {
      chainId: null,
      networkName: "",
      explorerBaseUrl: "",
    };
  }

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  return {
    chainId,
    networkName: network.name === "unknown" ? "" : network.name,
    explorerBaseUrl: EXPLORER_BASE_URLS_BY_CHAIN_ID[chainId] || "",
  };
}

function addExplorerLinks(data, explorerBaseUrl) {
  if (!explorerBaseUrl) {
    return data;
  }

  return {
    ...data,
    transactionUrl: data.transactionHash
      ? `${explorerBaseUrl}/tx/${data.transactionHash}`
      : "",
    contractUrl: data.contractAddress
      ? `${explorerBaseUrl}/address/${data.contractAddress}`
      : "",
  };
}

async function getOptionalTokenUri(trustAIContentNFT, tokenId) {
  try {
    if (typeof trustAIContentNFT.tokenURI !== "function") {
      return "";
    }

    return await trustAIContentNFT.tokenURI(tokenId);
  } catch {
    return "";
  }
}

async function getNFTDeploymentBlock(trustAIContentNFT) {
  if (nftDeploymentBlockPromise) {
    return nftDeploymentBlockPromise;
  }

  nftDeploymentBlockPromise = (async () => {
    const provider = trustAIContentNFT.runner?.provider;
    const contractAddress = await trustAIContentNFT.getAddress();

    if (!provider) {
      throw new Error("Blockchain provider is not configured");
    }

    const latestBlock = await provider.getBlockNumber();
    const latestCode = await provider.getCode(contractAddress, latestBlock);

    if (!latestCode || latestCode === "0x") {
      throw new Error(`NFT contract has no deployed bytecode at ${contractAddress}`);
    }

    let low = 0;
    let high = latestBlock;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const code = await provider.getCode(contractAddress, mid);

      if (code && code !== "0x") {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    logNFTMintDebug("NFT deployment block detected", {
      contractAddress,
      deploymentBlock: low,
      latestBlock,
    });

    return low;
  })().catch((error) => {
    nftDeploymentBlockPromise = undefined;
    throw error;
  });

  return nftDeploymentBlockPromise;
}

async function queryNFTEventsInChunks(trustAIContentNFT, filter) {
  const provider = trustAIContentNFT.runner?.provider;

  if (!provider) {
    throw new Error("Blockchain provider is not configured");
  }

  const fromBlock = await getNFTDeploymentBlock(trustAIContentNFT);
  const latestBlock = await provider.getBlockNumber();
  const events = [];
  let currentFromBlock = fromBlock;
  let chunkSize = NFT_EVENT_QUERY_CHUNK_SIZE;

  while (currentFromBlock <= latestBlock) {
    const currentToBlock = Math.min(
      currentFromBlock + chunkSize - 1,
      latestBlock
    );

    try {
      const chunkEvents = await trustAIContentNFT.queryFilter(
        filter,
        currentFromBlock,
        currentToBlock
      );
      events.push(...chunkEvents);
      currentFromBlock = currentToBlock + 1;
    } catch (error) {
      if (chunkSize > NFT_EVENT_QUERY_MIN_CHUNK_SIZE) {
        chunkSize = Math.max(
          Math.floor(chunkSize / 2),
          NFT_EVENT_QUERY_MIN_CHUNK_SIZE
        );
        logNFTMintDebug("Reducing NFT event query chunk size", {
          nextChunkSize: chunkSize,
          fromBlock: currentFromBlock,
          toBlock: currentToBlock,
          reason: getUserFacingBlockchainError(error),
        });
        continue;
      }

      throw error;
    }
  }

  return events;
}

async function getContentTokenizedEvents(trustAIContentNFT, contentHash) {
  const filter = trustAIContentNFT.filters.ContentTokenized(null, contentHash);
  return queryNFTEventsInChunks(trustAIContentNFT, filter);
}

async function getTokenEvent(trustAIContentNFT, tokenId) {
  const filter = trustAIContentNFT.filters.ContentTokenized(tokenId);
  const events = await queryNFTEventsInChunks(trustAIContentNFT, filter);
  return events.at(-1) || null;
}

async function readNFTDetails(trustAIContentNFT, tokenId, eventLog = null) {
  const contractAddress = await trustAIContentNFT.getAddress();
  const [owner, tokenContentHash, mintedAt, creatorAddress, tokenUri] =
    await Promise.all([
      trustAIContentNFT.ownerOf(tokenId),
      trustAIContentNFT.contentHash(tokenId),
      trustAIContentNFT.timestamp(tokenId),
      trustAIContentNFT.creator(tokenId),
      getOptionalTokenUri(trustAIContentNFT, tokenId),
    ]);
  const explorerContext = await getExplorerContext(trustAIContentNFT.runner);
  const transactionHash = eventLog?.transactionHash || "";
  const proofExists = await verifyProof(tokenContentHash);
  const verificationStatus = proofExists
    ? "Blockchain proof verified"
    : "Blockchain proof not found";

  return addExplorerLinks(
    {
      exists: true,
      tokenId: tokenId.toString(),
      owner,
      creator: creatorAddress,
      contractAddress,
      contentHash: tokenContentHash,
      mintTimestamp: Number(mintedAt),
      verificationStatus,
      transactionHash,
      tokenUri,
      metadata: {
        contentHash: tokenContentHash,
        contentTitle: "",
        creator: creatorAddress,
        creationTimestamp: Number(mintedAt),
        aiVerificationStatus: verificationStatus,
        tokenUri,
      },
      chainId: explorerContext.chainId,
      networkName: explorerContext.networkName,
      explorerBaseUrl: explorerContext.explorerBaseUrl,
    },
    explorerContext.explorerBaseUrl
  );
}

async function findTokenizedContent(normalizedHash) {
  const trustAIContentNFT = getTrustAIContentNFTContract();
  const events = await getContentTokenizedEvents(trustAIContentNFT, normalizedHash);

  for (const eventLog of [...events].reverse()) {
    const tokenId = eventLog.args.tokenId;

    try {
      return await readNFTDetails(trustAIContentNFT, tokenId, eventLog);
    } catch {
      // Keep searching in case a later read fails unexpectedly.
    }
  }

  return null;
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
  const configStatus = getProofBlockchainConfigStatus();

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
  const configStatus = getProofBlockchainConfigStatus();

  if (!configStatus.isConfigured) {
    return mockProofs.has(normalizedHash);
  }

  const trustAIProof = await getVerifiedTrustAIProofContract();

  return trustAIProof.verifyProof(normalizedHash);
}

export async function getBlockchainDiagnostics() {
  const configStatus = getBlockchainConfigStatus();
  const diagnostics = {
    ...configStatus,
    expectedChainId: REQUIRED_CHAIN_ID,
    expectedNetwork: REQUIRED_CHAIN_NAME,
    chainId: null,
    chainMatchesExpected: false,
    walletAddress: "",
    walletBalanceEth: "",
    proofContractAddress: process.env.TRUSTAI_PROOF_CONTRACT_ADDRESS?.trim() || "",
    nftContractAddress: process.env.TRUSTAI_NFT_CONTRACT_ADDRESS?.trim() || "",
    proofContractDeployed: false,
    nftContractDeployed: false,
    nftAbiMatchesExpected: false,
  };

  if (!configStatus.isConfigured) {
    return diagnostics;
  }

  verifyTrustAIContentNFTAbi();
  diagnostics.nftAbiMatchesExpected = true;

  const trustAIProof = await getVerifiedTrustAIProofContract();
  const trustAIContentNFT = getTrustAIContentNFTContract();
  const walletAddress = await trustAIContentNFT.runner.getAddress();
  const { provider, chainId } = await getRunnerNetworkContext(
    trustAIContentNFT.runner
  );
  const [walletBalance, proofDeployment, nftDeployment] = await Promise.all([
    provider.getBalance(walletAddress),
    assertDeployedContract(
      provider,
      await trustAIProof.getAddress(),
      "TRUSTAI_PROOF_CONTRACT_ADDRESS"
    ),
    assertDeployedContract(
      provider,
      await trustAIContentNFT.getAddress(),
      "TRUSTAI_NFT_CONTRACT_ADDRESS"
    ),
  ]);

  diagnostics.chainId = chainId;
  diagnostics.chainMatchesExpected = chainId === REQUIRED_CHAIN_ID;
  diagnostics.walletAddress = walletAddress;
  diagnostics.walletBalanceEth = formatEther(walletBalance);
  diagnostics.proofContractDeployed = proofDeployment.isDeployed;
  diagnostics.nftContractDeployed = nftDeployment.isDeployed;
  diagnostics.proofBytecodeSizeBytes = proofDeployment.bytecodeSizeBytes;
  diagnostics.nftBytecodeSizeBytes = nftDeployment.bytecodeSizeBytes;

  return diagnostics;
}

export async function mintContentNFT(contentHash) {
  const normalizedHash = normalizeContentHash(contentHash);
  verifyTrustAIContentNFTAbi();
  const trustAIProof = await getVerifiedTrustAIProofContract();
  const trustAIContentNFT = getTrustAIContentNFTContract();
  const contractAddress = await trustAIContentNFT.getAddress();
  const walletAddress = await trustAIContentNFT.runner.getAddress();
  const networkContext = await assertSepoliaNetwork(trustAIContentNFT.runner);
  const explorerContext = await getExplorerContext(trustAIContentNFT.runner);

  try {
    await assertDeployedContract(
      networkContext.provider,
      contractAddress,
      "TRUSTAI_NFT_CONTRACT_ADDRESS"
    );
  } catch (error) {
    throw createMintError(error, "NFT contract deployment check");
  }

  logNFTMintDebug("Starting mint", {
    contractAddress,
    chainId: explorerContext.chainId,
    walletAddress,
    mintFunction: TRUSTAI_NFT_MINT_FUNCTION,
    mintArguments: [normalizedHash],
  });

  const hasVerifiedProof = await trustAIProof.verifyProof(normalizedHash);

  logNFTMintDebug("Proof check completed", {
    contentHash: normalizedHash,
    hasVerifiedProof,
  });

  if (!hasVerifiedProof) {
    const error = new Error(
      "NFT minting requires verified blockchain proof for the current content."
    );
    error.code = "NFT_REQUIRES_VERIFIED_PROOF";
    throw error;
  }

  let existingNFT;
  let duplicateLookupWarning = "";

  try {
    existingNFT = await findTokenizedContent(normalizedHash);
    logNFTMintDebug("Duplicate lookup completed", {
      contentHash: normalizedHash,
      existingTokenId: existingNFT?.tokenId || "",
    });
  } catch (error) {
    duplicateLookupWarning =
      "Duplicate NFT lookup could not be completed because the RPC provider failed while reading historical NFT events. Continuing mint because this deployed NFT contract has no direct contentHash-to-tokenId lookup.";
    console.warn("[NFT Mint] Duplicate lookup skipped", {
      ...getBlockchainErrorDetails(error),
      warning: duplicateLookupWarning,
    });
  }

  if (existingNFT) {
    const error = new Error("This content has already been tokenized.");
    error.code = "NFT_DUPLICATE_CONTENT";
    error.nft = existingNFT;
    throw error;
  }

  try {
    await trustAIContentNFT[TRUSTAI_NFT_MINT_FUNCTION].staticCall(normalizedHash);
    logNFTMintDebug("Static mint simulation completed", {
      mintFunction: TRUSTAI_NFT_MINT_FUNCTION,
      mintArguments: [normalizedHash],
    });
  } catch (error) {
    console.error(
      "[NFT Mint] Static mint simulation failed",
      getBlockchainErrorDetails(error)
    );
    throw createMintError(error, "static simulation");
  }

  let estimatedGas;

  try {
    estimatedGas =
      await trustAIContentNFT[TRUSTAI_NFT_MINT_FUNCTION].estimateGas(
        normalizedHash
      );
    logNFTMintDebug("Gas estimate completed", {
      estimatedGas: estimatedGas.toString(),
    });
  } catch (error) {
    console.error("[NFT Mint] Gas estimation failed", getBlockchainErrorDetails(error));
    throw createMintError(error, "gas estimation");
  }

  try {
    const walletFunding = await assertWalletCanPayForMint({
      provider: networkContext.provider,
      walletAddress,
      estimatedGas,
    });

    logNFTMintDebug("Wallet funding check completed", {
      walletAddress,
      balanceEth: walletFunding.balanceEth,
      estimatedCostEth: walletFunding.estimatedCostEth,
      hasSufficientEth: walletFunding.hasSufficientEth,
    });
  } catch (error) {
    console.error(
      "[NFT Mint] Wallet funding check failed",
      getBlockchainErrorDetails(error)
    );
    throw createMintError(error, "wallet funding check");
  }

  let transaction;

  try {
    transaction = await trustAIContentNFT[TRUSTAI_NFT_MINT_FUNCTION](
      normalizedHash
    );
    logNFTMintDebug("Transaction submitted", {
      transactionHash: transaction.hash,
    });
  } catch (error) {
    console.error(
      "[NFT Mint] Transaction submission failed",
      getBlockchainErrorDetails(error)
    );
    throw createMintError(error, "transaction submission");
  }

  let receipt;

  try {
    receipt = await transaction.wait();
    logNFTMintDebug("Transaction receipt received", {
      transactionHash: receipt.hash,
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
    });
  } catch (error) {
    console.error(
      "[NFT Mint] Transaction receipt failed",
      getBlockchainErrorDetails(error)
    );
    throw createMintError(error, "receipt confirmation");
  }

  const contractInterface = new Interface(TRUSTAI_NFT_ABI);
  let tokenId;
  let tokenEvent;

  for (const log of receipt.logs) {
    try {
      const parsedLog = contractInterface.parseLog(log);

      if (parsedLog?.name === "ContentTokenized") {
        tokenId = parsedLog.args.tokenId;
        tokenEvent = {
          transactionHash: receipt.hash,
          args: parsedLog.args,
        };
        break;
      }
    } catch {
      // Ignore logs emitted by other contracts in the transaction receipt.
    }
  }

  if (!tokenId) {
    throw new Error("ContentTokenized event was not found in receipt");
  }

  const nft = await readNFTDetails(trustAIContentNFT, tokenId, tokenEvent);

  return {
    ...nft,
    transactionHash: receipt.hash,
    receiptStatus: Number(receipt.status),
    duplicateLookupWarning,
  };
}

export async function verifyContentNFT(tokenId) {
  const normalizedTokenId = normalizeTokenId(tokenId);
  const trustAIContentNFT = getTrustAIContentNFTContract();

  try {
    const eventLog = await getTokenEvent(trustAIContentNFT, normalizedTokenId);
    return await readNFTDetails(trustAIContentNFT, normalizedTokenId, eventLog);
  } catch (error) {
    if (
      error.code === "CALL_EXCEPTION" ||
      error.reason?.includes("nonexistent token") ||
      error.message?.includes("nonexistent token") ||
      error.message?.includes("ERC721NonexistentToken")
    ) {
      const contractAddress = await trustAIContentNFT.getAddress();
      const explorerContext = await getExplorerContext(trustAIContentNFT.runner);

      return addExplorerLinks(
        {
          exists: false,
          tokenId: normalizedTokenId.toString(),
          contractAddress,
          chainId: explorerContext.chainId,
          networkName: explorerContext.networkName,
          explorerBaseUrl: explorerContext.explorerBaseUrl,
        },
        explorerContext.explorerBaseUrl
      );
    }

    throw error;
  }
}
