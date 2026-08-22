import { postJson } from "./apiClient.js";

const HISTORY_STORAGE_KEY = "trustai:verification-history";
const MAX_HISTORY_ITEMS = 12;

function readHistory() {
  try {
    const parsedHistory = JSON.parse(
      window.localStorage.getItem(HISTORY_STORAGE_KEY) || "[]"
    );

    return Array.isArray(parsedHistory) ? parsedHistory : [];
  } catch {
    return [];
  }
}

function writeHistory(history) {
  try {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS))
    );
  } catch {
    // Verification should still succeed if browser storage is unavailable.
  }
}

export function getVerificationHistory() {
  return readHistory();
}

export function saveVerificationHistoryItem(verification) {
  const timestamp = new Date().toISOString();
  const historyItem = {
    id: verification.contentHash || `${timestamp}:${verification.trustScore}`,
    contentHash: verification.contentHash,
    verificationStatus: "Completed",
    trustScore: verification.trustScore,
    riskLevel: verification.riskLevel,
    summary: verification.summary,
    categories: verification.categories,
    claimsCount: Array.isArray(verification.claims) ? verification.claims.length : 0,
    blockchainStatus: "Not checked",
    timestamp,
  };
  const history = readHistory().filter((item) => item.id !== historyItem.id);

  writeHistory([historyItem, ...history]);
  postJson("/api/dashboard/history", { verification: historyItem }).catch(() => {});

  return historyItem;
}

export function updateVerificationHistoryItem(id, updates) {
  if (!id) return;

  const history = readHistory();
  const updatedHistory = history.map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );
  const updatedItem = updatedHistory.find((item) => item.id === id);

  writeHistory(updatedHistory);

  if (updatedItem) {
    postJson("/api/dashboard/history", { verification: updatedItem }).catch(() => {});
  }
}
