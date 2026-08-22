import {
  getVerificationHistory,
  saveVerificationHistoryItem,
  updateVerificationHistoryItem,
} from "../services/dashboardService.js";

export function getDashboardHistory(req, res) {
  return res.json({
    success: true,
    history: getVerificationHistory(),
  });
}

export function saveDashboardVerification(req, res) {
  const verification = req.body?.verification;

  if (!verification || typeof verification !== "object") {
    return res.status(400).json({
      success: false,
      message: "verification is required",
    });
  }

  return res.json({
    success: true,
    historyItem: saveVerificationHistoryItem(verification),
  });
}

export function updateDashboardVerification(req, res) {
  const { id } = req.params;
  const updates = req.body?.updates;

  if (!updates || typeof updates !== "object") {
    return res.status(400).json({
      success: false,
      message: "updates are required",
    });
  }

  const historyItem = updateVerificationHistoryItem(id, updates);

  if (!historyItem) {
    return res.status(404).json({
      success: false,
      message: "verification history item not found",
    });
  }

  return res.json({
    success: true,
    historyItem,
  });
}
