import { postJson } from "./apiClient.js";

export async function generateContent(prompt) {
  const data = await postJson("/api/ai/generate", { prompt });

  if (typeof data?.content !== "string") {
    throw new Error("Unable to generate content. Please try again.");
  }

  return data.content;
}
