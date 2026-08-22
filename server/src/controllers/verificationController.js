import { analyzeContent } from "../services/verificationService.js";

export async function analyzeVerificationContent(req, res) {
  const requestStartedAt = Date.now();
  const { content } = req.body;

  if (!content || !content.trim()) {
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

    console.log(`[Verify] Analysis successful in ${elapsedMs} ms`);

    return res.json({
      success: true,
      verification,
    });
  } catch (error) {
    console.error("Verification analysis failed:", error.message);

    if (error.message === "GEMINI_API_KEY is not configured") {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is not configured",
      });
    }

    if (error.isTemporaryGeminiUnavailable) {
      return res.status(503).json({
        success: false,
        message: "Verification is temporarily busy. Please try again.",
      });
    }

    return res.status(502).json({
      success: false,
      message: "Unable to analyze this content. Please try again.",
    });
  }
}
