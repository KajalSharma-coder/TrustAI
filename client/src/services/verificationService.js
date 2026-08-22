import { postJson } from "./apiClient.js";

export async function analyzeContent(content) {
  const data = await postJson("/api/verify/analyze", { content });

  if (!data?.verification) {
    throw new Error("Unable to analyze this content. Please try again.");
  }

  return data.verification;
}
