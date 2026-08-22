import { generateContentFromPrompt } from "./aiService.js";

const VALID_RISK_LEVELS = new Set(["LOW", "MEDIUM", "HIGH"]);
const VALID_CLAIM_STATUSES = new Set([
  "SUPPORTED",
  "CONTRADICTED",
  "NEEDS_VERIFICATION",
]);

function clampScore(score) {
  if (!Number.isFinite(score)) {
    throw new Error("Verification response included an invalid score");
  }

  return Math.min(Math.max(Math.round(score), 0), 100);
}

function extractJsonObject(text) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Verification response was not valid JSON");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function calculateTrustScore(categories) {
  return clampScore(
    categories.accuracy * 0.35 +
      categories.reliability * 0.25 +
      categories.consistency * 0.2 +
      categories.evidenceQuality * 0.2
  );
}

function normalizeRiskLevel(riskLevel, trustScore) {
  if (typeof riskLevel === "string") {
    const normalized = riskLevel.trim().toUpperCase();

    if (VALID_RISK_LEVELS.has(normalized)) {
      return normalized;
    }
  }

  if (trustScore >= 75) return "LOW";
  if (trustScore >= 50) return "MEDIUM";
  return "HIGH";
}

function normalizeClaims(claims) {
  if (!Array.isArray(claims)) {
    return [];
  }

  return claims
    .map((claim) => {
      const status =
        typeof claim?.status === "string"
          ? claim.status.trim().toUpperCase()
          : "NEEDS_VERIFICATION";

      return {
        claim: typeof claim?.claim === "string" ? claim.claim.trim() : "",
        status: VALID_CLAIM_STATUSES.has(status)
          ? status
          : "NEEDS_VERIFICATION",
        confidence: clampScore(Number(claim?.confidence ?? 0)),
        reason:
          typeof claim?.reason === "string" && claim.reason.trim()
            ? claim.reason.trim()
            : "The verifier did not provide a detailed reason.",
      };
    })
    .filter((claim) => claim.claim)
    .slice(0, 12);
}

function normalizeVerification(rawVerification) {
  const rawCategories = rawVerification?.categories;

  if (!rawCategories || typeof rawCategories !== "object") {
    throw new Error("Verification response did not include category scores");
  }

  const categories = {
    accuracy: clampScore(Number(rawCategories.accuracy)),
    reliability: clampScore(Number(rawCategories.reliability)),
    consistency: clampScore(Number(rawCategories.consistency)),
    evidenceQuality: clampScore(Number(rawCategories.evidenceQuality)),
  };
  const trustScore = calculateTrustScore(categories);

  return {
    trustScore,
    riskLevel: normalizeRiskLevel(rawVerification?.riskLevel, trustScore),
    summary:
      typeof rawVerification?.summary === "string" &&
      rawVerification.summary.trim()
        ? rawVerification.summary.trim()
        : "The verifier completed the analysis, but did not include a summary.",
    categories,
    claims: normalizeClaims(rawVerification?.claims),
  };
}

export async function analyzeContent(content) {
  const prompt = `You are TrustAI, an AI content verification analyst.
Analyze the provided content for factual claims, support level, risk, and explainable scoring.

Important rules:
- Return only valid JSON. Do not include markdown.
- Do not pretend to have live internet access.
- Do not invent sources or citations.
- If a claim cannot be confidently verified from your available knowledge and the supplied content, mark it NEEDS_VERIFICATION.
- The trustScore value you return may be estimated, but the backend will recalculate the final trustScore from categories.

Return JSON with this exact shape:
{
  "trustScore": 0,
  "riskLevel": "LOW",
  "summary": "Short explanation of the overall assessment.",
  "categories": {
    "accuracy": 0,
    "reliability": 0,
    "consistency": 0,
    "evidenceQuality": 0
  },
  "claims": [
    {
      "claim": "Specific factual claim from the content",
      "status": "SUPPORTED",
      "confidence": 0,
      "reason": "Short explanation"
    }
  ]
}

Valid riskLevel values: LOW, MEDIUM, HIGH.
Valid claim status values: SUPPORTED, CONTRADICTED, NEEDS_VERIFICATION.
All scores and confidence values must be integers from 0 to 100.

Content:
"""${content.slice(0, 12000)}"""`;

  const responseText = await generateContentFromPrompt(prompt);
  const rawVerification = extractJsonObject(responseText);

  return normalizeVerification(rawVerification);
}
