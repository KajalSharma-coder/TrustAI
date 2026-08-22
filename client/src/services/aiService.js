import { postJson } from "./apiClient.js";

export async function generateContent(prompt) {
  const data = await postJson("/api/ai/generate", { prompt });

  return data.content;
}
