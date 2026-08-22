import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import aiRoutes from "./routes/aiRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/ai", aiRoutes);

const server = app.listen(PORT, () => {
  console.log(`TrustAI server is running on port ${PORT}`);
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
