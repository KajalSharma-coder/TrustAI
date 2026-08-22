import { generateContentFromPrompt } from "../services/aiService.js";
import { analyzeContent } from "../services/verificationService.js";

export async function generateAiContent(req, res) {
  const requestStartedAt = Date.now();
  console.log("[AI] Request received");

  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    console.log("[AI] Prompt missing");

    return res.status(400).json({
      success: false,
      message: "Prompt is required",
    });
  }

  try {
    const optimizedPrompt = `Write a concise, useful response in simple language.
Avoid unnecessary repetition and keep the answer focused.

User request:
${prompt.trim()}`;
    const content = await generateContentFromPrompt(optimizedPrompt);
    const elapsedMs = Date.now() - requestStartedAt;

    console.log(`[AI] Generation successful in ${elapsedMs} ms`);

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error("AI generation failed:", error.message);

    if (error.message === "GEMINI_API_KEY is not configured") {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is not configured",
      });
    }

    if (error.isTemporaryGeminiUnavailable) {
      return res.status(503).json({
        success: false,
        code: "AI_TEMPORARILY_UNAVAILABLE",
        message: "AI service is temporarily busy. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      code: "AI_TEMPORARILY_UNAVAILABLE",
      message: "AI service is temporarily busy. Please try again.",
    });
  }
}

export async function verifyAiContent(req, res) {
  const requestStartedAt = Date.now();
  console.log("[AI] Verification request received");

  const { content } = req.body;

  if (!content || !content.trim()) {
    console.log("[AI] Verification content missing");

    return res.status(400).json({
      success: false,
      message: "Content is required",
    });
  }

  const trimmedContent = content.trim();

  if (trimmedContent.length > 12000) {
    return res.status(413).json({
      success: false,
      message: "Content must be 12,000 characters or less",
    });
  }

  try {
    const verification = await analyzeContent(trimmedContent);
    const elapsedMs = Date.now() - requestStartedAt;

    console.log(`[AI] Verification successful in ${elapsedMs} ms`);

    return res.json({
      success: true,
      verification,
    });
  } catch (error) {
    console.error("AI verification failed:", error.message);

    if (error.message === "GEMINI_API_KEY is not configured") {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is not configured",
      });
    }

    if (error.isTemporaryGeminiUnavailable) {
      return res.status(503).json({
        success: false,
        code: "AI_TEMPORARILY_UNAVAILABLE",
        message: "AI verification is temporarily busy. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "AI verification could not complete. Please try again.",
    });
  }
}
