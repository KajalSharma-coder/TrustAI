# 🔐 TrustAI

### AI-Powered Content Verification with Cryptographic Integrity & Blockchain Proof

> **Trust the content. Verify the claim. Prove the integrity.**

TrustAI is a full-stack AI verification platform designed to answer a simple but increasingly important question:

**Can we trust AI-generated content?**

The platform combines **Generative AI, explainable verification, weighted trust scoring, SHA-256 content hashing, Ethereum-compatible blockchain proofs, and NFT-based content tokenization** into one workflow.

Instead of only generating AI content, TrustAI focuses on what happens **after generation** — analyzing claims, estimating their trustworthiness, creating a tamper-evident digital fingerprint, and optionally anchoring that fingerprint on-chain.

---

## ✨ Why TrustAI?

Generative AI makes producing information extremely easy. At the same time, users need better ways to understand:

- What claims are present in a piece of content?
- Which claims appear supported or contradicted?
- Which claims still need verification?
- How trustworthy is the overall content?
- Has the verified content changed later?
- Can there be a permanent blockchain proof of the original content?

TrustAI brings these steps together in a single application.

---

## 🚀 Core Features

### 🤖 1. AI Content Generation

Generate concise AI responses through the Google Gemini API.

The generated output can immediately be passed into the verification workflow, creating a simple **generate → verify** experience.

### 🧠 2. Explainable AI Verification

TrustAI analyzes submitted content and returns:

- Overall summary
- Individual factual claims
- Claim status
- Confidence score
- Explanation for each claim
- Category-level scores
- Overall risk level

Supported claim statuses:

- `SUPPORTED`
- `CONTRADICTED`
- `NEEDS_VERIFICATION`

> **Important:** The current verifier is an AI knowledge-based analysis system. It does not claim live internet access and does not invent external citations.

### 📊 3. Weighted Trust Score

The final Trust Score is calculated on a **0–100 scale** from four categories:

| Category | Weight |
|---|---:|
| Accuracy | 35% |
| Reliability | 25% |
| Consistency | 20% |
| Evidence Quality | 20% |

Risk classification:

- **LOW** → Trust Score ≥ 75
- **MEDIUM** → Trust Score ≥ 50
- **HIGH** → Trust Score < 50

This makes the verification result easier to understand than a simple true/false response.

### 🔐 4. SHA-256 Content Integrity

Every verification request can generate a SHA-256 hash of the normalized content.

The hash acts as a **digital fingerprint** of the verified content.

If the content changes, the resulting hash changes as well.

### ⛓️ 5. Blockchain Proof

TrustAI includes the `TrustAIProof` Solidity contract.

A content hash can be stored on an Ethereum-compatible blockchain together with:

- Owner address
- Blockchain timestamp
- Proof existence status

The application can later check whether a specific content hash has an on-chain proof.

### 🎨 6. Content NFT

TrustAI also includes `TrustAIContentNFT`, an ERC-721 smart contract built using OpenZeppelin.

Verified content can be tokenized as an NFT containing:

- Token ID
- Content hash
- Creator address
- Timestamp

This provides a blockchain-based identity for the content fingerprint.

### 📈 7. Verification Dashboard

The frontend provides a dashboard-oriented experience for reviewing verification activity, scores, risk levels, and blockchain-related information.

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │       User           │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React + Vite UI    │
                    │  Generate / Verify   │
                    │      Dashboard       │
                    └──────────┬───────────┘
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │   Node.js + Express  │
                    │      Backend         │
                    └───────┬───────┬──────┘
                            │       │
                 ┌──────────┘       └───────────┐
                 ▼                              ▼
        ┌──────────────────┐          ┌──────────────────┐
        │   Google Gemini  │          │  SHA-256 Hashing │
        │ AI Generation &  │          │  Content         │
        │ Verification     │          │  Integrity       │
        └──────────────────┘          └────────┬─────────┘
                                               │
                                               ▼
                                     ┌──────────────────┐
                                     │ Ethereum /       │
                                     │ Sepolia Network  │
                                     └────────┬─────────┘
                                              │
                              ┌───────────────┴──────────────┐
                              ▼                              ▼
                    ┌──────────────────┐          ┌──────────────────┐
                    │ TrustAIProof     │          │ TrustAIContentNFT│
                    │ Content Proof    │          │ ERC-721 Token    │
                    └──────────────────┘          └──────────────────┘
```

---

# 🔄 Verification Workflow

```text
Content
   ↓
AI Analysis
   ↓
Claim Extraction
   ↓
Claim Classification
   ↓
Category Scoring
   ↓
Weighted Trust Score
   ↓
Risk Classification
   ↓
SHA-256 Content Hash
   ↓
Blockchain Proof
   ↓
Optional NFT Tokenization
```

---

# 🛠️ Technology Stack

## Frontend

- React 19
- Vite
- React Router
- Tailwind CSS
- JavaScript / JSX

## Backend

- Node.js
- Express.js
- REST APIs
- CORS
- dotenv

## Artificial Intelligence

- Google Gemini API
- `@google/genai`

## Blockchain / Web3

- Solidity `^0.8.20`
- Ethereum-compatible network
- Sepolia
- Ethers.js
- Hardhat
- OpenZeppelin ERC-721

## Security & Integrity

- SHA-256 content hashing
- Bytes32 blockchain hashes
- On-chain proof verification
- Tamper detection through hash comparison

---

# 📂 Project Structure

```text
TrustAI-main/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Generate.jsx
│   │   │   ├── Verify.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── services/
│   │   │   ├── aiService.js
│   │   │   ├── apiClient.js
│   │   │   ├── blockchainService.js
│   │   │   ├── dashboardService.js
│   │   │   └── verificationService.js
│   │   ├── utils/
│   │   │   └── integrity.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── aiController.js
│   │   │   ├── blockchainController.js
│   │   │   ├── dashboardController.js
│   │   │   └── verificationController.js
│   │   ├── routes/
│   │   └── services/
│   ├── .env.example
│   └── package.json
│
├── contracts/
│   ├── TrustAIProof.sol
│   └── TrustAIContentNFT.sol
│
├── scripts/
│   ├── deploy.js
│   └── deployNFT.js
│
├── hardhat.config.js
├── package.json
└── README.md
```

---
# Snapshots

<img width="1728" height="880" alt="image" src="https://github.com/user-attachments/assets/975d9cf8-0b69-466f-9658-2f8f5264f3bd" />

<img width="1798" height="887" alt="image" src="https://github.com/user-attachments/assets/8a306735-dc4a-4c64-828b-c9f07b5e3fed" />

<img width="712" height="885" alt="image" src="https://github.com/user-attachments/assets/2298f614-f461-476e-92cd-495a9b4a5367" />

<img width="807" height="766" alt="image" src="https://github.com/user-attachments/assets/954121ac-5440-47e6-ae75-8ee9fcaaab59" />

<img width="793" height="872" alt="image" src="https://github.com/user-attachments/assets/66c6ce14-5df6-4473-a995-fa472b804148" />

<img width="816" height="910" alt="image" src="https://github.com/user-attachments/assets/edfe1872-2d5f-4358-8731-a4023b0da939" />


# ⚙️ Getting Started

## Prerequisites

Make sure you have:

- Node.js 18+
- npm
- A Google Gemini API key
- A Sepolia-compatible RPC endpoint for blockchain features
- A funded Sepolia wallet for blockchain transactions

---

## 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd TrustAI-main
```

## 2. Install Dependencies

```bash
npm install
npm --prefix client install
npm --prefix server install
```

## 3. Configure Environment Variables

Create:

```text
server/.env
```

Example:

```env
PORT=5000

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_model
GEMINI_FALLBACK_MODELS=your_fallback_models

BLOCKCHAIN_RPC_URL=your_sepolia_rpc_url
BLOCKCHAIN_PRIVATE_KEY=your_wallet_private_key

TRUSTAI_PROOF_CONTRACT_ADDRESS=your_proof_contract_address
TRUSTAI_NFT_CONTRACT_ADDRESS=your_nft_contract_address
TRUSTAI_NFT_DEPLOYMENT_BLOCK=your_nft_deployment_block
```

> Never commit `.env` files or private wallet keys to GitHub.

---

# ▶️ Run the Application

### Start Frontend

```bash
npm run client
```

Frontend:

```text
http://localhost:5173
```

### Start Backend

```bash
npm run server
```

Backend:

```text
http://localhost:5000
```

### Run Frontend + Backend Together

```bash
npm run dev
```

### Backend Health Check

```text
GET /api/health
```

---

# ⛓️ Smart Contracts

TrustAI contains two core contracts.

### `TrustAIProof.sol`

Responsible for storing and verifying content proofs.

Main functions:

```solidity
storeProof(bytes32 contentHash)
verifyProof(bytes32 contentHash)
```

### `TrustAIContentNFT.sol`

ERC-721 contract for tokenizing content fingerprints.

Main functions:

```solidity
mintContent(bytes32 newContentHash)
contentHash(uint256 tokenId)
timestamp(uint256 tokenId)
creator(uint256 tokenId)
```

Compile contracts:

```bash
npm run compile
```

Deploy the proof contract to Sepolia:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Deploy the NFT contract:

```bash
npx hardhat run scripts/deployNFT.js --network sepolia
```

After deployment, add the resulting contract addresses to `server/.env`.

---

# 🔒 Security Notes

- Keep private keys outside source control.
- Use environment variables for API keys and RPC credentials.
- Do not expose wallet private keys in frontend code.
- Content hashes are stored rather than requiring the original content to be placed on-chain.
- The application limits verification input to 12,000 characters.
- Blockchain proof storage is designed around a unique content hash.

---

# 🧪 Development

Build the frontend:

```bash
npm run build
```

Compile Solidity contracts:

```bash
npm run compile
```

The project also contains an integrity utility test:

```text
client/src/utils/integrity.test.js
```

---

# 🌐 Live Project

**Live Demo:** trust-ai-velo.vercel.app

**Blockchain:** Sepolia

---

# 🎯 Future Roadmap

TrustAI can be extended with:

- 🌐 Live web/source-based fact verification
- 🔎 Multi-source evidence retrieval
- 🤖 Multi-model verification
- 🧩 Browser extension for instant verification
- 📱 Mobile-friendly verification workflows
- 📜 Verifiable credentials
- 🔗 Decentralized verification history
- 🏢 Enterprise verification APIs
- 📷 QR-based proof verification
- 🛡️ Advanced misinformation and deepfake detection

---

# 🏆 Project Vision

TrustAI is built around a simple principle:

> **AI can generate information. Trust requires verification.**

The long-term vision is to build an ecosystem where AI-generated content is not only created quickly, but can also be **analyzed, scored, fingerprinted, verified, and backed by tamper-evident blockchain proof**.

---

## 👩‍💻 Built With

**React • Node.js • Express • Google Gemini • Solidity • Ethereum • Sepolia • Ethers.js • Hardhat • OpenZeppelin • SHA-256**

---

## 📄 License

This project is intended for educational, experimental, and hackathon purposes.

---

### ⭐ If you find TrustAI interesting, consider starring the repository and sharing your feedback!
