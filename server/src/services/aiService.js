import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL_CHAIN = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
];
const REQUEST_TIMEOUT_MS = 15000;
const TEMPORARY_STATUS_CODES = new Set([429, 500, 503]);
const KNOWN_STATUS_CODES = new Set([400, 401, 403, 408, 429, 500, 502, 503, 504]);

function extractStatusCode(error) {
  if (KNOWN_STATUS_CODES.has(error?.status)) {
    return error.status;
  }

  if (KNOWN_STATUS_CODES.has(error?.code)) {
    return error.code;
  }

  const message = error?.message || "";
  const statusMatch = message.match(/\b(400|401|403|408|429|500|502|503|504)\b/);

  return statusMatch ? Number(statusMatch[1]) : null;
}

function isTemporaryError(error) {
  const statusCode = extractStatusCode(error);

  return TEMPORARY_STATUS_CODES.has(statusCode);
}

function isTimeoutError(error) {
  return Boolean(error?.isGeminiTimeout || error?.name === "AbortError");
}

function shouldTryFallback(error) {
  return isTimeoutError(error) || isTemporaryError(error);
}

function createBusyError(message = "AI service is temporarily busy. Please try again.") {
  const error = new Error(message);
  error.isTemporaryGeminiUnavailable = true;
  error.code = "AI_TEMPORARILY_UNAVAILABLE";
  return error;
}

function formatElapsed(elapsedMs) {
  return `${(elapsedMs / 1000).toFixed(1)}s`;
}

function getErrorLabel(error) {
  if (isTimeoutError(error)) {
    return "timeout";
  }

  return extractStatusCode(error) || error?.code || "network error";
}

function getConfiguredModels() {
  const explicitFallbackModels = [
    process.env.GEMINI_FALLBACK_MODEL,
    process.env.GEMINI_FALLBACK_MODELS,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  const envModels = [
    process.env.GEMINI_MODEL,
    ...explicitFallbackModels,
    ...DEFAULT_MODEL_CHAIN,
  ].filter(Boolean);

  return [...new Set(envModels.map((model) => model.trim()).filter(Boolean))];
}

async function generateWithModel(ai, model, prompt) {
  const controller = new AbortController();
  const requestStartedAt = Date.now();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    console.log(`[AI] Trying model: ${model}`);

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        abortSignal: controller.signal,
      },
    });

    const elapsedMs = Date.now() - requestStartedAt;
    const content =
      typeof response.text === "function" ? response.text() : response.text;

    if (!content || !content.trim()) {
      throw new Error("Gemini returned an empty response");
    }

    console.log(`[AI] Model succeeded: ${model}`);
    console.log(`[AI] Response received in ${formatElapsed(elapsedMs)}`);

    return content.trim();
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("Gemini request timed out");
      timeoutError.isGeminiTimeout = true;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateContentFromPrompt(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasApiKey = Boolean(apiKey && apiKey !== "YOUR_GEMINI_API_KEY");
  console.log(`[AI] API key configured: ${hasApiKey}`);

  if (!hasApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const models = getConfiguredModels();
  let lastError;

  for (const [index, model] of models.entries()) {
    try {
      return await generateWithModel(ai, model, prompt);
    } catch (error) {
      lastError = error;
      console.log(`[AI] ${model} failed: ${getErrorLabel(error)}`);

      if (!shouldTryFallback(error) || index === models.length - 1) {
        break;
      }

      console.log(`[AI] Trying fallback model: ${models[index + 1]}`);
    }
  }

  if (shouldTryFallback(lastError)) {
    throw createBusyError();
  }

  throw lastError;
}
