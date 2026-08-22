import { GoogleGenAI } from "@google/genai";

const DEFAULT_PRIMARY_MODEL = "gemini-3.7-flash";
const DEFAULT_FALLBACK_MODEL = "gemini-3.6-flash";
const REQUEST_TIMEOUT_MS = 10000;
const OVERALL_TIMEOUT_MS = 20000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;
const TEMPORARY_STATUS_CODES = new Set([429, 500, 503]);
const KNOWN_STATUS_CODES = new Set([400, 401, 403, 408, 429, 500, 503]);

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractStatusCode(error) {
  if (KNOWN_STATUS_CODES.has(error?.status)) {
    return error.status;
  }

  if (KNOWN_STATUS_CODES.has(error?.code)) {
    return error.code;
  }

  const message = error?.message || "";
  const statusMatch = message.match(/\b(400|401|403|408|429|500|503)\b/);

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
  return error;
}

function getRemainingMs(deadlineMs) {
  return Math.max(deadlineMs - Date.now(), 0);
}

async function generateWithModel(ai, model, prompt, deadlineMs) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const remainingMs = getRemainingMs(deadlineMs);

    if (remainingMs <= 0) {
      throw createBusyError();
    }

    const controller = new AbortController();
    const requestStartedAt = Date.now();
    const timeoutMs = Math.min(REQUEST_TIMEOUT_MS, remainingMs);
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      console.log("[AI] Starting Gemini request");

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          abortSignal: controller.signal,
        },
      });

      const elapsedMs = Date.now() - requestStartedAt;
      console.log(`[AI] Model response received in ${elapsedMs} ms`);

      const content =
        typeof response.text === "function" ? response.text() : response.text;

      if (!content) {
        throw new Error("Gemini returned an empty response");
      }

      return content;
    } catch (error) {
      lastError = error;
      const elapsedMs = Date.now() - requestStartedAt;
      const statusCode = extractStatusCode(error);

      if (statusCode) {
        console.log(`[AI] Gemini returned ${statusCode}`);
      }

      if (isTimeoutError(error)) {
        console.log(`[AI] Gemini request timed out after ${elapsedMs} ms`);
        const timeoutError = new Error("Gemini request timed out");
        timeoutError.isGeminiTimeout = true;
        lastError = timeoutError;
      }

      if (!isTemporaryError(lastError) || attempt === MAX_ATTEMPTS) {
        break;
      }

      if (getRemainingMs(deadlineMs) <= RETRY_DELAY_MS) {
        break;
      }

      console.log("[AI] Temporary Gemini error. Retrying once...");
      await wait(RETRY_DELAY_MS);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
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

  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  const fallbackModel =
    process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  const deadlineMs = Date.now() + OVERALL_TIMEOUT_MS;

  try {
    return await generateWithModel(ai, primaryModel, prompt, deadlineMs);
  } catch (primaryError) {
    if (!shouldTryFallback(primaryError) || fallbackModel === primaryModel) {
      throw primaryError;
    }

    if (getRemainingMs(deadlineMs) <= 0) {
      throw createBusyError();
    }

    console.log("[AI] Switching to fallback model");

    try {
      return await generateWithModel(ai, fallbackModel, prompt, deadlineMs);
    } catch (fallbackError) {
      if (shouldTryFallback(fallbackError)) {
        throw createBusyError();
      }

      throw fallbackError;
    }
  }
}
