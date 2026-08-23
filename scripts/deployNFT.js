import { artifacts, network } from "hardhat";

const POLL_INTERVAL_MS = 3_000;

async function waitForReceipt(provider, transactionHash) {
  for (;;) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [transactionHash],
    });

    if (receipt !== null) {
      return receipt;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function main() {
  const connection = await network.create("sepolia");

  try {
    const { provider } = connection;
    const accounts = await provider.request({ method: "eth_accounts" });

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error("No deployer account configured for Sepolia.");
    }

    const artifact = await artifacts.readArtifact("TrustAIContentNFT");
    const transactionHash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: accounts[0],
          data: artifact.bytecode,
        },
      ],
    });

    const receipt = await waitForReceipt(provider, transactionHash);

    if (receipt.status !== "0x1" || receipt.contractAddress == null) {
      throw new Error("Deployment transaction failed.");
    }

    console.log(`NFT contract address: ${receipt.contractAddress}`);
    console.log(`Deployment transaction hash: ${transactionHash}`);
  } finally {
    await connection.close();
  }
}

main().catch(() => {
  console.error(
    "NFT deployment failed. Check the Sepolia RPC URL, configured wallet, and account balance."
  );
  process.exitCode = 1;
});
