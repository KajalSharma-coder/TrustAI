export function getHealth(req, res) {
  res.json({
    success: true,
    message: "TrustAI server is running",
  });
}
