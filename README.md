# TrustAI

TrustAI is a 24-hour hackathon project for verifying AI-generated output. The project will eventually generate AI content, analyze it, create an integrity hash, store proof on an Ethereum-compatible blockchain, and let users verify whether content has been modified.

This initial version only includes the basic frontend and backend setup. AI, blockchain, authentication, databases, QR verification, and hashing are intentionally not implemented yet.

## Project Structure

```text
trustai/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── contracts/
├── README.md
├── .gitignore
└── package.json
```

## Install Dependencies

From the project root:

```bash
npm install
npm --prefix client install
npm --prefix server install
```

## Run Frontend

```bash
npm run client
```

Frontend runs on `http://localhost:5173`.

## Run Backend

Create `server/.env` from `server/.env.example` and add your Gemini API key:

```bash
PORT=5000
GEMINI_API_KEY=your_real_gemini_api_key
```

```bash
npm run server
```

Backend runs on `http://localhost:5000` by default.

Health check:

```bash
GET http://localhost:5000/api/health
```

## Run Frontend and Backend Together

```bash
npm run dev
```
