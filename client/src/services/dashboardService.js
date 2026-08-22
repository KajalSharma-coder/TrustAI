import { getJson } from "./apiClient.js";
import { getVerificationHistory } from "./verificationHistoryService.js";

function mergeHistory(primaryHistory, fallbackHistory) {
  const mergedById = new Map();

  [...primaryHistory, ...fallbackHistory].forEach((item) => {
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
