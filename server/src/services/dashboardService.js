const MAX_HISTORY_ITEMS = 50;

let verificationHistory = [];

function normalizeTimestamp(timestamp) {
  return timestamp || new Date().toISOString();
}

function createHistoryItem(verification) {
  const timestamp = normalizeTimestamp(verification.timestamp);

  return {
    id: verification.id || verification.contentHash || `${timestamp}:${verification.trustScore}`,
    contentHash: verification.contentHash,
    verificationStatus: verification.verificationStatus || "Completed",
    trustScore: verification.trustScore,
    riskLevel: verification.riskLevel,
    summary: verification.summary,
    categories: verification.categories,
    claimsCount:
      typeof verification.claimsCount === "number"
        ? verification.claimsCount
        : Array.isArray(verification.claims)
        ? verification.claims.length
        : 0,
    blockchainStatus: verification.blockchainStatus || "Not checked",
    blockchainProof: verification.blockchainProof,
    integrityCheck: verification.integrityCheck,
    timestamp,
  };
}

export function getVerificationHistory() {
  return verificationHistory;
}

export function saveVerificationHistoryItem(verification) {
  const historyItem = createHistoryItem(verification);
  const existingHistory = verificationHistory.filter(
    (item) => item.id !== historyItem.id
  );

  verificationHistory = [historyItem, ...existingHistory].slice(0, MAX_HISTORY_ITEMS);

  return historyItem;
}

export function updateVerificationHistoryItem(id, updates) {
  if (!id) {
    return null;
  }

  let updatedItem = null;

  verificationHistory = verificationHistory.map((item) => {
    if (item.id !== id) {
      return item;
    }

    updatedItem = {
      ...item,
      ...updates,
      timestamp: item.timestamp,
    };

    return updatedItem;
  });

  return updatedItem;
}
