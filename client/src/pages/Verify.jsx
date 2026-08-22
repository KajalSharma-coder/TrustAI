import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import ClaimCard from "../components/ClaimCard.jsx";
import SectionHeading from "../components/SectionHeading.jsx";
import TrustScore from "../components/TrustScore.jsx";
import { analyzeContent } from "../services/verificationService.js";

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

function getClaimStats(claims = []) {
  return {
    total: claims.length,
    supported: claims.filter((claim) => claim.status === "SUPPORTED").length,
    contradicted: claims.filter((claim) => claim.status === "CONTRADICTED").length,
    needsVerification: claims.filter(
      (claim) => claim.status === "NEEDS_VERIFICATION"
    ).length,
  };
}

function Verify() {
  const location = useLocation();
  const [content, setContent] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTakingLonger, setIsTakingLonger] = useState(false);
  const [isWhyOpen, setIsWhyOpen] = useState(false);

  useEffect(() => {
    const routedContent = location.state?.content;
    const pendingContent =
      routedContent || window.localStorage.getItem("trustai:verification-content");

    if (pendingContent) {
      setContent(pendingContent);
      window.localStorage.removeItem("trustai:verification-content");
    }
  }, [location.state]);

  async function handleAnalyze() {
    const trimmedContent = content.trim();

    setError("");
    setResult(null);
    setIsTakingLonger(false);
    setIsWhyOpen(false);

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
    setIsTakingLonger(false);
    setIsWhyOpen(false);
  }

  async function handleCopyHash() {
    if (!result?.contentHash) return;
    await navigator.clipboard?.writeText(result.contentHash);
  }

  const claimStats = getClaimStats(result?.claims);

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
            onChange={(event) => setContent(event.target.value)}
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

          {result.contentHash && (
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge>Content Integrity</Badge>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    Content Integrity Hash
                  </h2>
                </div>
                <Button variant="secondary" onClick={handleCopyHash}>
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
              </div>
            )}
          </Card>

          <Card>
            <Badge>Extracted Claims</Badge>
            <div className="mt-5 space-y-4">
              {result.claims.length ? (
                result.claims.map((claim, index) => (
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
