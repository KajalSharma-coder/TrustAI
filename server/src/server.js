import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import aiRoutes from "./routes/aiRoutes.js";
import blockchainRoutes from "./routes/blockchainRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
import { getBlockchainDiagnostics } from "./services/blockchainService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });
console.log(
  `[AI] API key configured: ${Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY"
  )}`
);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/verify", verificationRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/dashboard", dashboardRoutes);

const server = app.listen(PORT, () => {
  console.log(`TrustAI server is running on port ${PORT}`);
  getBlockchainDiagnostics()
    .then((diagnostics) => {
      console.log("[Blockchain] Diagnostics", {
        rpcConfigured: diagnostics.rpcUrlConfigured,
        chainId: diagnostics.chainId,
        chainMatchesExpected: diagnostics.chainMatchesExpected,
        proofContractAddress: diagnostics.proofContractAddress,
        nftContractAddress: diagnostics.nftContractAddress,
        nftContractDeployed: diagnostics.nftContractDeployed,
      });
    })
    .catch((error) => {
      console.error("[Blockchain] Diagnostics failed", {
        message: error.message,
      });
    });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the existing TrustAI server or use another port.`
    );
    process.exit(1);
  }

  console.error("Server failed to start:", error.message);
  process.exit(1);
});
