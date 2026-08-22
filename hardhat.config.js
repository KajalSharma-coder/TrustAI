import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "hardhat/config";

dotenv.config({ path: ".env", quiet: true });

for (const name of [
  "BLOCKCHAIN_RPC_URL",
  "BLOCKCHAIN_PRIVATE_KEY",
  "TRUSTAI_PROOF_CONTRACT_ADDRESS",
]) {
  if (!process.env[name]?.trim()) {
    delete process.env[name];
  }
}

dotenv.config({ path: "server/.env", override: false, quiet: true });

const sepoliaRpcUrl = process.env.BLOCKCHAIN_RPC_URL?.trim();
const rawSepoliaPrivateKey = process.env.BLOCKCHAIN_PRIVATE_KEY?.trim();
const sepoliaPrivateKey =
  rawSepoliaPrivateKey && !rawSepoliaPrivateKey.startsWith("0x")
    ? `0x${rawSepoliaPrivateKey}`
    : rawSepoliaPrivateKey;

function isValidPrivateKey(privateKey) {
  return /^0x[a-fA-F0-9]{64}$/.test(privateKey || "");
}

const sepolia =
  sepoliaRpcUrl && isValidPrivateKey(sepoliaPrivateKey)
    ? {
        type: "http",
        chainId: 11155111,
        url: sepoliaRpcUrl,
        accounts: [sepoliaPrivateKey],
      }
    : {
        type: "http",
        chainId: 11155111,
        url: "https://ethereum-sepolia-rpc.publicnode.com",
        accounts: [],
      };

const cachedSolcPath = process.env.LOCALAPPDATA
  ? path.join(
      process.env.LOCALAPPDATA,
      "hardhat-nodejs",
      "Cache",
      "compilers-v3",
      "wasm",
      "soljson-v0.8.20+commit.a1b79de6.js"
    )
  : null;

export default defineConfig({
  solidity: {
    version: "0.8.20",
    ...(cachedSolcPath && fs.existsSync(cachedSolcPath)
      ? { path: cachedSolcPath }
      : {}),
  },

  networks: {
    sepolia,
  },
});
