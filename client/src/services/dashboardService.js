import { getJson } from "./apiClient.js";
import { getVerificationHistory } from "./verificationHistoryService.js";

function mergeHistory(primaryHistory, fallbackHistory) {
  const mergedById = new Map();

  // Local history is the freshest source because blockchain/integrity updates
  // are written locally first and the backend persistence call is asynchronous.
  // Process backend first so a stale backend record cannot overwrite a newer
  // local integrity/tamper result.
  [...fallbackHistory, ...primaryHistory].forEach((item) => {
    if (!item?.id) {
      return;
    }

    mergedById.set(item.id, {
      ...mergedById.get(item.id),
      ...item,
    });
  });

  return [...mergedById.values()].sort(
    (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );
}

export async function getDashboardHistory() {
  const localHistory = getVerificationHistory();

  try {
    const data = await getJson("/api/dashboard/history");
    const backendHistory = Array.isArray(data?.history) ? data.history : [];

    return mergeHistory(localHistory, backendHistory);
  } catch {
    return localHistory;
  }
}
