import { generateContentFromPrompt } from "../services/aiService.js";

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
    const content = await generateContentFromPrompt(prompt.trim());
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
        message: "AI service is temporarily busy. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "AI service is temporarily busy. Please try again.",
    });
  }
}
