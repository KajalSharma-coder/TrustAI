import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import ClaimCard from "../components/ClaimCard.jsx";
import SectionHeading from "../components/SectionHeading.jsx";
import TrustScore from "../components/TrustScore.jsx";
import {
  mintContentAsNFT,
  storeProofOnBlockchain,
  verifyContentNFT,
  verifyProofOnBlockchain,
} from "../services/blockchainService.js";
import { analyzeContent } from "../services/verificationService.js";
import {
  clearActiveBlockchainProof,
  getActiveBlockchainProof,
  saveVerificationHistoryItem,
  saveActiveBlockchainProof,
  updateVerificationHistoryItem,
} from "../services/verificationHistoryService.js";
import {
  createIntegrityCheck,
  normalizeHash,
} from "../utils/integrity.js";

const processSteps = [
  "Content",
  "Content Integrity",
  "Claim Extraction",
  "Risk Analysis",
  "Category Scores",
  "Trust Score",
];

const loadingSteps = [
  "Analyzing AI content...",
  "Extracting claims...",
  "Evaluating reliability...",
  "Calculating Trust Score...",
];

const scoreCategories = [
  {
    key: "accuracy",
    label: "Accuracy",
    weight: 0.35,
    description:
      "Measures how well the content appears to match known facts and avoids unsupported assertions.",
  },
  {
    key: "reliability",
    label: "Reliability",
    weight: 0.25,
    description:
      "Reflects whether the content is presented consistently and with signals of dependable sourcing or reasoning.",
  },
  {
    key: "consistency",
    label: "Consistency",
    weight: 0.2,
    description:
      "Checks whether the content avoids internal contradictions or conflicting claims.",
  },
  {
    key: "evidenceQuality",
    label: "Evidence Quality",
    weight: 0.2,
    description:
      "Assesses whether the claims are backed by useful context, specificity, or supporting evidence.",
  },
];

function getClaimStats(claims = []) {
  const claimItems = Array.isArray(claims) ? claims : [];

  return {
    total: claimItems.length,
    supported: claimItems.filter((claim) => claim.status === "SUPPORTED").length,
    contradicted: claimItems.filter((claim) => claim.status === "CONTRADICTED").length,
    needsVerification: claimItems.filter(
      (claim) => claim.status === "NEEDS_VERIFICATION"
    ).length,
  };
}

function formatProofTimestamp(timestamp) {
  if (!timestamp) {
    return "Timestamp unavailable";
  }

  return new Date(timestamp * 1000).toLocaleString();
}

async function generateContentHash(content) {
  if (!window.crypto?.subtle) {
    throw new Error("Unable to calculate content hash in this browser.");
  }

  const encodedContent = new TextEncoder().encode(content);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", encodedContent);

  return [...new Uint8Array(hashBuffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getScoreBreakdown(categories = {}) {
  const categoryValues = categories && typeof categories === "object" ? categories : {};

  return scoreCategories.map((category) => {
    const value =
      typeof categoryValues[category.key] === "number"
        ? categoryValues[category.key]
        : 0;

    return {
      ...category,
      value,
      contribution: value * category.weight,
    };
  });
}

function formatReportValue(value, fallback = "--") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function formatNftTimestamp(timestamp) {
  if (!timestamp) {
    return "Timestamp unavailable";
  }

  return new Date(Number(timestamp) * 1000).toLocaleString();
}

function ExplorerValue({ href, children }) {
  const className = "font-mono break-all text-white";

  if (!href) {
    return <span className={className}>{children}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${className} underline decoration-cyan-200/40 underline-offset-4 transition hover:text-cyan-100`}
    >
      {children}
    </a>
  );
}

function getContentIntegrityStatus(integrityCheck, proofError) {
  if (proofError) return "Verification error";
  if (integrityCheck?.status === "match") return "Verified";
  if (integrityCheck?.status === "mismatch") return "Hash mismatch";
  if (integrityCheck?.status === "missing" && integrityCheck?.tampered) {
    return "Tampered";
  }
  if (integrityCheck?.status === "missing") return "No proof found";
  return "Not checked";
}

function getBlockchainProofStatus(proofResult, integrityCheck, proofError) {
  if (proofError) return "Verification error";
  if (integrityCheck?.status === "match" || integrityCheck?.status === "mismatch") {
    return "Proof found";
  }
  if (integrityCheck?.status === "missing" && integrityCheck?.tampered) {
    return "No matching proof";
  }
  if (integrityCheck?.status === "missing") return "No proof found";
  if (proofResult) return "Proof stored";
  return "Not checked";
}

function Verify() {
  const location = useLocation();
  const [content, setContent] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStoringProof, setIsStoringProof] = useState(false);
  const [isVerifyingProof, setIsVerifyingProof] = useState(false);
  const [isMintingNFT, setIsMintingNFT] = useState(false);
  const [isVerifyingNFT, setIsVerifyingNFT] = useState(false);
  const [proofResult, setProofResult] = useState(null);
  const [nftResult, setNftResult] = useState(null);
  const [nftTokenId, setNftTokenId] = useState("");
  const [nftVerificationResult, setNftVerificationResult] = useState(null);
  const [integrityCheck, setIntegrityCheck] = useState(null);
  const [proofError, setProofError] = useState("");
  const [nftError, setNftError] = useState("");
  const [nftVerificationError, setNftVerificationError] = useState("");
  const [isTakingLonger, setIsTakingLonger] = useState(false);
  const [isWhyOpen, setIsWhyOpen] = useState(false);
  const [historyItemId, setHistoryItemId] = useState(null);
  const [previousProofResult, setPreviousProofResult] = useState(null);
  const [analyzedContent, setAnalyzedContent] = useState("");

  useEffect(() => {
    const routedContent = location.state?.content;
    const pendingContent =
      routedContent || window.localStorage.getItem("trustai:verification-content");

    if (pendingContent) {
      setContent(pendingContent);
      window.localStorage.removeItem("trustai:verification-content");
    }
  }, [location.state]);

  function handleContentChange(event) {
    setContent(event.target.value);

    if (integrityCheck || nftResult || nftError) {
      setIntegrityCheck(null);
      setNftResult(null);
      setNftError("");
      setSuccessMessage("");
    }
  }

  async function handleAnalyze() {
    if (isLoading) return;

    const trimmedContent = content.trim();

    setError("");
    setSuccessMessage("");
    setResult(null);
    setProofResult(null);
    setNftResult(null);
    setNftVerificationResult(null);
    setIntegrityCheck(null);
    setProofError("");
    setNftError("");
    setNftVerificationError("");
    setIsTakingLonger(false);
    setIsWhyOpen(false);
    setHistoryItemId(null);
    setPreviousProofResult(null);
    setAnalyzedContent("");
    clearActiveBlockchainProof();

    if (!trimmedContent) {
      setError("Paste content to analyze first.");
      return;
    }

    if (trimmedContent.length > 12000) {
      setError("Content must be 12,000 characters or less.");
      return;
    }

    const slowTimer = setTimeout(() => {
      setIsTakingLonger(true);
    }, 5000);

    try {
      setIsLoading(true);
      const verification = await analyzeContent(trimmedContent);
      setResult(verification);
      setAnalyzedContent(trimmedContent);
      const historyItem = saveVerificationHistoryItem(verification);
      setHistoryItemId(historyItem.id);
      setSuccessMessage("Verification completed successfully.");
    } catch (err) {
      setError(err.message || "Unable to analyze this content. Please try again.");
    } finally {
      clearTimeout(slowTimer);
      setIsLoading(false);
      setIsTakingLonger(false);
    }
  }

  function handleClear() {
    setContent("");
    setResult(null);
    setError("");
    setSuccessMessage("");
    setProofResult(null);
    setNftResult(null);
    setNftVerificationResult(null);
    setIntegrityCheck(null);
    setProofError("");
    setNftError("");
    setNftVerificationError("");
    setIsTakingLonger(false);
    setIsWhyOpen(false);
    setHistoryItemId(null);
    setPreviousProofResult(null);
    setAnalyzedContent("");
    clearActiveBlockchainProof();
  }

  async function handleCopyHash() {
    if (!result?.contentHash) return;

    try {
      await navigator.clipboard?.writeText(result.contentHash);
      setSuccessMessage("Content hash copied.");
    } catch {
      setProofError("Unable to copy content hash.");
    }
  }

  async function handleStoreProof() {
    if (isStoringProof || isVerifyingProof || isMintingNFT) return;
    if (!result?.contentHash) return;

    setProofError("");
    setNftError("");
    setSuccessMessage("");
    setIntegrityCheck(null);

    try {
      setIsStoringProof(true);
      const proof = await storeProofOnBlockchain(result.contentHash);
      setProofResult(proof);
      setPreviousProofResult(proof);
      saveActiveBlockchainProof(proof);
      updateVerificationHistoryItem(historyItemId, {
        blockchainStatus: "Proof stored",
        blockchainProof: proof,
      });
      setSuccessMessage("Blockchain proof stored successfully.");
    } catch (err) {
      setProofError(
        err.message || "Unable to store proof on blockchain. Please try again."
      );
    } finally {
      setIsStoringProof(false);
    }
  }

  async function handleVerifyProof() {
    if (isVerifyingProof || isStoringProof || isMintingNFT) return;
    if (!result?.contentHash) return;

    setProofError("");
    setNftError("");
    setSuccessMessage("");
    setIntegrityCheck(null);

    try {
      setIsVerifyingProof(true);
      const currentContent = content.trim();
      const currentHash =
        currentContent === analyzedContent && result?.contentHash
          ? normalizeHash(result.contentHash)
          : await generateContentHash(currentContent);
      const activeProofCandidate =
        previousProofResult || getActiveBlockchainProof();
      const activeProof =
        normalizeHash(activeProofCandidate?.contentHash) ===
        normalizeHash(result.contentHash)
          ? activeProofCandidate
          : null;
      const originalHash = activeProof?.contentHash;
      const blockchainResult = await verifyProofOnBlockchain(
        currentHash,
        originalHash
      );
      const integrityResult = blockchainResult?.integrity || {};
      const integrityCheckResult = createIntegrityCheck({
        currentHash,
        originalHash: integrityResult.originalHash || originalHash,
        checkedHash: currentHash,
        proofExists: blockchainResult.exists,
      });

      if (!blockchainResult.exists) {
        const blockchainStatus = integrityCheckResult.tampered
          ? "No matching proof"
          : "No proof found";

        updateVerificationHistoryItem(historyItemId, {
          blockchainStatus,
          integrityCheck: integrityCheckResult,
        });
        setIntegrityCheck(integrityCheckResult);
        setSuccessMessage("Blockchain verification completed.");
        return;
      }

      updateVerificationHistoryItem(historyItemId, {
        blockchainStatus: integrityCheckResult.tampered
          ? "Hash mismatch"
          : "Verified",
        integrityCheck: integrityCheckResult,
      });
      setIntegrityCheck(integrityCheckResult);
      setSuccessMessage("Blockchain verification completed.");
    } catch (err) {
      setProofError(
        err.message || "Unable to verify blockchain proof. Please try again."
      );
    } finally {
      setIsVerifyingProof(false);
    }
  }

  async function handleMintNFT() {
    if (isMintingNFT || isStoringProof || isVerifyingProof || isVerifyingNFT) return;
    const verifiedContentHash =
      integrityCheck?.status === "match" && !integrityCheck.tampered
        ? integrityCheck.currentHash
        : "";

    if (!verifiedContentHash) {
      setNftError("Verify blockchain proof before minting NFT.");
      return;
    }

    setNftError("");
    setProofError("");
    setSuccessMessage("");

    try {
      setIsMintingNFT(true);
      const nft = await mintContentAsNFT(verifiedContentHash);
      setNftResult(nft);
      setNftTokenId(nft.tokenId);
      setNftVerificationResult(nft);
      setSuccessMessage("NFT minted successfully.");
    } catch (err) {
      if (err.nft) {
        setNftVerificationResult(err.nft);
        setNftTokenId(err.nft.tokenId || "");
      }

      setNftError(err.message || "Unable to mint NFT. Please try again.");
    } finally {
      setIsMintingNFT(false);
    }
  }

  async function handleVerifyNFT() {
    if (isBlockchainActionRunning || isVerifyingNFT) return;

    const trimmedTokenId = nftTokenId.trim();

    setNftVerificationError("");
    setNftVerificationResult(null);
    setSuccessMessage("");

    if (!trimmedTokenId) {
      setNftVerificationError("Enter an NFT Token ID.");
      return;
    }

    try {
      setIsVerifyingNFT(true);
      const nft = await verifyContentNFT(trimmedTokenId);
      setNftVerificationResult(nft);
      setSuccessMessage("NFT verification completed.");
    } catch (err) {
      setNftVerificationError(
        err.message || "Unable to verify NFT on blockchain. Please try again."
      );
    } finally {
      setIsVerifyingNFT(false);
    }
  }

  const claimStats = getClaimStats(result?.claims);
  const extractedClaims = Array.isArray(result?.claims) ? result.claims : [];
  const scoreBreakdown = getScoreBreakdown(result?.categories);
  const calculatedTrustScore = Math.round(
    scoreBreakdown.reduce((total, item) => total + item.contribution, 0)
  );
  const isBlockchainActionRunning =
    isStoringProof || isVerifyingProof || isMintingNFT || isVerifyingNFT;
  const isContentVerifiedForMint =
    integrityCheck?.status === "match" && !integrityCheck.tampered;
  const verifiedContentHash = isContentVerifiedForMint
    ? integrityCheck.currentHash
    : "";
  const canMintNFT = Boolean(verifiedContentHash) && !nftResult;
  const reportItems = [
    {
      label: "Trust Score",
      value:
        typeof result?.trustScore === "number" ? result.trustScore : undefined,
    },
    { label: "Risk Level", value: result?.riskLevel },
    {
      label: "Accuracy",
      value:
        typeof result?.categories?.accuracy === "number"
          ? result.categories.accuracy
          : undefined,
    },
    {
      label: "Reliability",
      value:
        typeof result?.categories?.reliability === "number"
          ? result.categories.reliability
          : undefined,
    },
    {
      label: "Consistency",
      value:
        typeof result?.categories?.consistency === "number"
          ? result.categories.consistency
          : undefined,
    },
    {
      label: "Evidence Quality",
      value:
        typeof result?.categories?.evidenceQuality === "number"
          ? result.categories.evidenceQuality
          : undefined,
    },
    {
      label: "Content Integrity",
      value: getContentIntegrityStatus(integrityCheck, proofError),
    },
    {
      label: "Blockchain Proof",
      value: getBlockchainProofStatus(proofResult, integrityCheck, proofError),
    },
    { label: "Extracted Claims", value: claimStats.total },
  ];

  return (
    <section className="page-shell mx-auto max-w-6xl space-y-8">
      <SectionHeading
        badge="Phase 1"
        title="AI Content Verification"
        subtitle="Analyze text, extract claims, assess risk and produce an explainable Trust Score."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
        <Card className="animate-slide-up">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Content to verify
              </label>
              <p className="mt-2 text-sm text-slate-400">
                Paste AI-generated text or any content that needs a trust analysis.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {content.length}/12000 characters
            </span>
          </div>

          <textarea
            value={content}
            onChange={handleContentChange}
            rows="13"
            className="input-glass mt-4 min-h-80 resize-y leading-7"
            placeholder="Paste content here..."
            disabled={isLoading}
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleAnalyze} disabled={isLoading}>
              {isLoading ? "Analyzing content..." : "Analyze Content"} <span>→</span>
            </Button>
            <Button onClick={handleClear} variant="secondary" disabled={isLoading}>
              Clear
            </Button>
          </div>

          {isLoading && (
            <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" />
                {isTakingLonger
                  ? "Still analyzing... the verifier is reviewing risk signals."
                  : "Analyzing AI content..."}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {loadingSteps.map((step) => (
                  <div
                    key={step}
                    className="rounded-xl border border-cyan-100/10 bg-slate-950/20 px-3 py-2 text-xs text-cyan-50"
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-400/10 p-4 text-red-100">
              {error}
            </div>
          )}

          {successMessage && !error && (
            <div className="mt-6 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-emerald-50">
              {successMessage}
            </div>
          )}
        </Card>

        <Card>
          <Badge>Verification Process</Badge>
          <div className="mt-6 grid gap-3">
            {processSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-sm font-bold text-cyan-100">
                  {index + 1}
                </span>
                <span className="font-semibold text-white">{step}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-slate-400">
            Phase 1 uses Gemini analysis to extract claims, score categories,
            assess risk and explain the Trust Score.
          </p>
        </Card>
      </div>

      {result && (
        <div className="space-y-6">
          <TrustScore
            score={result.trustScore}
            riskLevel={result.riskLevel}
            summary={result.summary}
            categories={result.categories}
          />

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge>Verification Report</Badge>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Verification Report
                </h2>
              </div>
              <p className="text-sm text-slate-400">
                Compact summary of the current verification result.
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reportItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatReportValue(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {result.contentHash && (
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge>Content Integrity</Badge>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    Content Integrity Hash
                  </h2>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleCopyHash}
                  disabled={isBlockchainActionRunning}
                >
                  Copy Hash
                </Button>
              </div>
              <div className="mt-5 overflow-x-auto rounded-2xl border border-cyan-300/20 bg-slate-950/50 p-4 font-mono text-sm leading-6 text-cyan-100">
                {result.contentHash}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                This SHA-256 fingerprint uniquely represents the analyzed content.
                If the content changes, the fingerprint changes.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={handleStoreProof}
                  disabled={isBlockchainActionRunning || Boolean(proofResult)}
                >
                  {isStoringProof
                    ? "Storing Proof..."
                    : "Store Proof on Blockchain"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleVerifyProof}
                  disabled={isBlockchainActionRunning}
                >
                  {isVerifyingProof
                    ? "Verifying Proof..."
                    : "Verify Blockchain Proof"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleMintNFT}
                  disabled={isBlockchainActionRunning || !canMintNFT}
                >
                  {isMintingNFT ? "Minting NFT..." : "Mint as NFT"}
                </Button>
              </div>
              {!isContentVerifiedForMint && !integrityCheck && !nftResult && (
                <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-50">
                  Verify blockchain proof before minting NFT.
                </div>
              )}
              {integrityCheck?.status === "match" && (
                <div
                  className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-emerald-50"
                >
                  <p className="font-semibold">✓ Content Integrity Verified</p>
                  <p className="mt-1 text-sm">No changes detected</p>
                </div>
              )}
              {integrityCheck?.status === "mismatch" && (
                <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-amber-50">
                  <p className="font-semibold">⚠ Content May Have Been Tampered</p>
                  <p className="mt-1 text-sm">Hash mismatch detected</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-amber-100/80">Original/stored hash:</p>
                      <p className="mt-1 break-all font-mono text-white">
                        {integrityCheck.storedHash}
                      </p>
                    </div>
                    <div>
                      <p className="text-amber-100/80">Current hash:</p>
                      <p className="mt-1 break-all font-mono text-white">
                        {integrityCheck.currentHash}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {integrityCheck?.status === "missing" && (
                <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-amber-50">
                  {integrityCheck.tampered ? (
                    <>
                      <p className="font-semibold">
                        ⚠ Content May Have Been Tampered
                      </p>
                      <p className="mt-1 text-sm">
                        No matching blockchain proof found for the current hash.
                      </p>
                      <div className="mt-4 space-y-3 text-sm">
                        <div>
                          <p className="text-amber-100/80">
                            Original/stored hash:
                          </p>
                          <p className="mt-1 break-all font-mono text-white">
                            {integrityCheck.storedHash}
                          </p>
                        </div>
                        <div>
                          <p className="text-amber-100/80">Current hash:</p>
                          <p className="mt-1 break-all font-mono text-white">
                            {integrityCheck.currentHash}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    "⚠ No matching blockchain proof found"
                  )}
                </div>
              )}
              {proofResult && (
                <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-emerald-50">
                  <p className="font-semibold">✓ Proof Stored on Blockchain</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      <span className="text-emerald-100/80">
                        Transaction Hash:
                      </span>{" "}
                      <span className="font-mono break-all text-white">
                        {proofResult.transactionHash}
                      </span>
                    </p>
                    <p>
                      <span className="text-emerald-100/80">Timestamp:</span>{" "}
                      <span className="text-white">
                        {formatProofTimestamp(proofResult.timestamp)}
                      </span>
                    </p>
                  </div>
                </div>
              )}
              {nftResult && (
                <div className="mt-5 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4 text-cyan-50">
                  <p className="font-semibold">NFT Minted</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      <span className="text-cyan-100/80">NFT Token ID:</span>{" "}
                      <span className="font-mono break-all text-white">
                        {nftResult.tokenId}
                      </span>
                    </p>
                    <p>
                      <span className="text-cyan-100/80">
                        NFT Contract Address:
                      </span>{" "}
                      <ExplorerValue href={nftResult.contractUrl}>
                        {nftResult.contractAddress}
                      </ExplorerValue>
                    </p>
                    <p>
                      <span className="text-cyan-100/80">
                        Transaction Hash:
                      </span>{" "}
                      <ExplorerValue href={nftResult.transactionUrl}>
                        {nftResult.transactionHash}
                      </ExplorerValue>
                    </p>
                    <p>
                      <span className="text-cyan-100/80">Content Hash:</span>{" "}
                      <span className="font-mono break-all text-white">
                        {nftResult.contentHash}
                      </span>
                    </p>
                    <p>
                      <span className="text-cyan-100/80">Creator/Owner:</span>{" "}
                      <span className="font-mono break-all text-white">
                        {nftResult.creator || nftResult.owner}
                      </span>
                    </p>
                    {nftResult.owner && nftResult.owner !== nftResult.creator && (
                      <p>
                        <span className="text-cyan-100/80">Current Owner:</span>{" "}
                        <span className="font-mono break-all text-white">
                          {nftResult.owner}
                        </span>
                      </p>
                    )}
                    <p>
                      <span className="text-cyan-100/80">Mint Timestamp:</span>{" "}
                      <span className="text-white">
                        {formatNftTimestamp(nftResult.mintTimestamp)}
                      </span>
                    </p>
                    <p>
                      <span className="text-cyan-100/80">
                        Verification Status:
                      </span>{" "}
                      <span className="text-white">
                        {nftResult.verificationStatus}
                      </span>
                    </p>
                    {nftResult.tokenUri ? (
                      <p>
                        <span className="text-cyan-100/80">Token URI:</span>{" "}
                        <span className="font-mono break-all text-white">
                          {nftResult.tokenUri}
                        </span>
                      </p>
                    ) : (
                      <p className="text-cyan-100/80">
                        The deployed NFT contract stores on-chain content hash,
                        creator, and timestamp, but no custom token URI metadata.
                      </p>
                    )}
                    {nftResult.chainId && (
                      <p>
                        <span className="text-cyan-100/80">Network:</span>{" "}
                        <span className="text-white">
                          {nftResult.networkName || `Chain ${nftResult.chainId}`}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="font-semibold text-white">Verify NFT</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={nftTokenId}
                    onChange={(event) => setNftTokenId(event.target.value)}
                    className="input-glass"
                    inputMode="numeric"
                    placeholder="Enter NFT Token ID"
                    disabled={isBlockchainActionRunning}
                  />
                  <Button
                    variant="secondary"
                    onClick={handleVerifyNFT}
                    disabled={isBlockchainActionRunning || !nftTokenId.trim()}
                  >
                    {isVerifyingNFT ? "Verifying NFT..." : "Verify NFT"}
                  </Button>
                </div>
                {nftVerificationResult && (
                  <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-50">
                    <p className="font-semibold">
                      {nftVerificationResult.exists
                        ? "NFT exists"
                        : "NFT does not exist"}
                    </p>
                    <div className="mt-3 space-y-2">
                      <p>
                        <span className="text-cyan-100/80">Token ID:</span>{" "}
                        <span className="font-mono break-all text-white">
                          {nftVerificationResult.tokenId}
                        </span>
                      </p>
                      <p>
                        <span className="text-cyan-100/80">Contract:</span>{" "}
                        <ExplorerValue href={nftVerificationResult.contractUrl}>
                          {nftVerificationResult.contractAddress}
                        </ExplorerValue>
                      </p>
                      {nftVerificationResult.exists && (
                        <>
                          <p>
                            <span className="text-cyan-100/80">Owner:</span>{" "}
                            <span className="font-mono break-all text-white">
                              {nftVerificationResult.owner}
                            </span>
                          </p>
                          <p>
                            <span className="text-cyan-100/80">
                              Associated Content Hash:
                            </span>{" "}
                            <span className="font-mono break-all text-white">
                              {nftVerificationResult.contentHash}
                            </span>
                          </p>
                          <p>
                            <span className="text-cyan-100/80">
                              Mint Timestamp:
                            </span>{" "}
                            <span className="text-white">
                              {formatNftTimestamp(
                                nftVerificationResult.mintTimestamp
                              )}
                            </span>
                          </p>
                          <p>
                            <span className="text-cyan-100/80">
                              Verification Status:
                            </span>{" "}
                            <span className="text-white">
                              {nftVerificationResult.verificationStatus}
                            </span>
                          </p>
                          {nftVerificationResult.transactionHash && (
                            <p>
                              <span className="text-cyan-100/80">
                                Transaction Hash:
                              </span>{" "}
                              <ExplorerValue
                                href={nftVerificationResult.transactionUrl}
                              >
                                {nftVerificationResult.transactionHash}
                              </ExplorerValue>
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                {nftVerificationError && (
                  <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-400/10 p-4 text-red-100">
                    {nftVerificationError}
                  </div>
                )}
              </div>
              {proofError && (
                <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-400/10 p-4 text-red-100">
                  {proofError}
                </div>
              )}
              {nftError && (
                <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-400/10 p-4 text-red-100">
                  {nftError}
                </div>
              )}
            </Card>
          )}

          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge>Why This Score?</Badge>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Score explanation
                </h2>
              </div>
              <Button
                variant="secondary"
                onClick={() => setIsWhyOpen((current) => !current)}
              >
                {isWhyOpen ? "Hide Details" : "Why this score?"}
              </Button>
            </div>

            {isWhyOpen && (
              <div className="mt-6 space-y-5">
                <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 leading-7 text-slate-200">
                  {result.summary}
                </p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs text-slate-500">Claims analyzed</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {claimStats.total}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                    <p className="text-xs text-emerald-100">Supported</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {claimStats.supported}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4">
                    <p className="text-xs text-red-100">Contradicted</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {claimStats.contradicted}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                    <p className="text-xs text-amber-100">Needs verification</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {claimStats.needsVerification}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Score Breakdown
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        The final Trust Score is a weighted average of the four
                        category scores returned by the analysis.
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Final Trust Score
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {result.trustScore}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {scoreBreakdown.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-white">
                              {item.label}: {item.value}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-400">
                              {item.description}
                            </p>
                          </div>
                          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                            {Math.round(item.weight * 100)}% weight
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-300">
                          {item.value} x {Math.round(item.weight * 100)}% ={" "}
                          {item.contribution.toFixed(1)} points
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
                    ({scoreBreakdown
                      .map(
                        (item) =>
                          `${item.value} x ${Math.round(item.weight * 100)}%`
                      )
                      .join(" + ")}
                    ) = {calculatedTrustScore}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <Badge>Extracted Claims</Badge>
            <div className="mt-5 space-y-4">
              {extractedClaims.length ? (
                extractedClaims.map((claim, index) => (
                  <ClaimCard key={`${claim.claim}-${index}`} claim={claim} />
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-slate-300">
                  No factual claims were extracted from this content.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}

export default Verify;
