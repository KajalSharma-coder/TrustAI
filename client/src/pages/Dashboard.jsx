import { useEffect, useState } from "react";
import Badge from "../components/Badge.jsx";
import Card from "../components/Card.jsx";
import SectionHeading from "../components/SectionHeading.jsx";
import TrustScore from "../components/TrustScore.jsx";
import { getDashboardHistory } from "../services/dashboardService.js";

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Timestamp unavailable";
  }

  return new Date(timestamp).toLocaleString();
}

function formatProofTimestamp(timestamp) {
  if (!timestamp) {
    return "Timestamp unavailable";
  }

  return new Date(timestamp * 1000).toLocaleString();
}

function isCompletedVerification(item) {
  return item?.verificationStatus === "Completed";
}

function hasSuccessfulBlockchainProof(item) {
  return ["Proof stored", "Verified"].includes(item?.blockchainStatus);
}

function normalizeHash(hash) {
  if (typeof hash !== "string") {
    return "";
  }

  return hash.trim().replace(/^0x/i, "").toLowerCase();
}

function hasIntegrityVerificationData(item) {
  const integrityCheck = item?.integrityCheck;

  return Boolean(
    integrityCheck &&
      (integrityCheck.status === "match" || integrityCheck.status === "mismatch") &&
      normalizeHash(integrityCheck.currentHash) &&
      normalizeHash(integrityCheck.storedHash)
  );
}

function hasTamperedContent(item) {
  if (!hasIntegrityVerificationData(item)) {
    return false;
  }

  return (
    normalizeHash(item.integrityCheck.currentHash) !==
    normalizeHash(item.integrityCheck.storedHash)
  );
}

function getTamperedContentDetail(integrityVerificationCount, tamperedContentCount) {
  if (!integrityVerificationCount) {
    return "No integrity data yet";
  }

  return tamperedContentCount
    ? "Hash mismatches detected"
    : "No hash mismatches detected";
}

function getIntegrityStatus(blockchainStatus) {
  if (blockchainStatus === "Verified") return "Verified";
  if (blockchainStatus === "Hash mismatch") return "Tampered";
  if (blockchainStatus === "No proof found") return "No proof found";
  if (blockchainStatus === "Proof stored") return "Proof stored";
  return "Not checked";
}

function toNumber(value) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function getDashboardCategories(verification) {
  const categories = verification?.categories;

  if (!categories || typeof categories !== "object") {
    return null;
  }

  return {
    accuracy: toNumber(categories.accuracy),
    reliability: toNumber(categories.reliability),
    consistency: toNumber(categories.consistency),
    evidenceQuality: toNumber(categories.evidenceQuality),
  };
}

function Dashboard() {
  const [verificationHistory, setVerificationHistory] = useState([]);

  useEffect(() => {
    let isMounted = true;

    getDashboardHistory().then((history) => {
      if (isMounted) {
        setVerificationHistory(history);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const latestVerification = verificationHistory[0];
  const latestTrustScore = toNumber(latestVerification?.trustScore);
  const latestCategories = getDashboardCategories(latestVerification);
  const completedVerificationCount = verificationHistory.filter(
    isCompletedVerification
  ).length;
  const blockchainProofCount = verificationHistory.filter(
    hasSuccessfulBlockchainProof
  ).length;
  const integrityVerificationCount = verificationHistory.filter(
    hasIntegrityVerificationData
  ).length;
  const tamperedContentCount = verificationHistory.filter(hasTamperedContent).length;
  const hasVerificationData = Boolean(latestVerification);
  const verificationStatusItems = [
    {
      label: "Content Analysis",
      value: latestVerification?.verificationStatus || "No data",
    },
    {
      label: "Trust Scoring",
      value: latestTrustScore !== null ? "Completed" : "No data",
    },
    {
      label: "Blockchain Proof",
      value: latestVerification?.blockchainStatus || "Not checked",
    },
    {
      label: "Integrity Check",
      value: getIntegrityStatus(latestVerification?.blockchainStatus),
    },
  ];
  const hasBlockchainActivity =
    latestVerification?.blockchainStatus &&
    latestVerification.blockchainStatus !== "Not checked";
  const latestBlockchainProof = latestVerification?.blockchainProof;
  const blockchainActivityItems = [
    {
      label: "Proof Status",
      value: latestVerification?.blockchainStatus,
    },
    {
      label: "Content Hash",
      value: latestBlockchainProof?.contentHash || latestVerification?.contentHash,
    },
    {
      label: "Transaction Hash",
      value: latestBlockchainProof?.transactionHash,
    },
    {
      label: "Block Number",
      value: latestBlockchainProof?.blockNumber,
    },
    {
      label: "Last Updated",
      value: latestBlockchainProof
        ? formatProofTimestamp(latestBlockchainProof.timestamp)
        : formatTimestamp(latestVerification?.timestamp),
    },
  ];
  const cards = [
    {
      title: "Trust Score",
      value: latestTrustScore ?? "--",
      detail:
        latestTrustScore !== null
          ? "Latest verification score"
          : "No score data yet",
    },
    {
      title: "Documents Verified",
      value: completedVerificationCount || "--",
      detail: completedVerificationCount
        ? "Completed verifications"
        : "No verification data yet",
    },
    {
      title: "Blockchain Proofs",
      value: blockchainProofCount || "--",
      detail: blockchainProofCount ? "Proof records found" : "No proof data yet",
    },
    {
      title: "Tampered Content",
      value: integrityVerificationCount ? tamperedContentCount : "--",
      detail: getTamperedContentDetail(
        integrityVerificationCount,
        tamperedContentCount
      ),
    },
  ];

  return (
    <section className="page-shell space-y-8">
      <SectionHeading
        badge="Analytics"
        title="Trust Dashboard"
        subtitle="Monitor content authenticity and verification activity."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
              {card.title}
            </h2>
            <p className="mt-4 text-4xl font-bold text-white">{card.value}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{card.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <TrustScore
          score={latestTrustScore}
          riskLevel={latestVerification?.riskLevel}
          summary={latestVerification?.summary}
          categories={latestCategories}
        />

        <Card>
          <Badge>Recent Verifications</Badge>
          {verificationHistory.length ? (
            <div className="mt-6 space-y-3">
              {verificationHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.verificationStatus || "Completed"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatTimestamp(item.timestamp)}
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                      {typeof item.trustScore === "number"
                        ? `${item.trustScore} Trust Score`
                        : "-- Trust Score"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Verification Status
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-200">
                        {item.riskLevel ? `${item.riskLevel} risk` : "Completed"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Blockchain Status
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-200">
                        {item.blockchainStatus || "Not checked"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-center">
              <p className="text-lg font-semibold text-white">
                No verification data yet
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Verified content activity will appear here after real verification
                data is available.
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Badge>Verification Status</Badge>
          {hasVerificationData ? (
            <div className="mt-6 space-y-3">
              {verificationStatusItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <span className="text-slate-200">{item.label}</span>
                  <span className="rounded-full border border-slate-500/30 px-3 py-1 text-xs text-slate-400">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {[
                "Content Analysis",
                "Trust Scoring",
                "Blockchain Proof",
                "Integrity Check",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <span className="text-slate-200">{item}</span>
                  <span className="rounded-full border border-slate-500/30 px-3 py-1 text-xs text-slate-400">
                    No data
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <Badge>Blockchain Activity</Badge>
          {hasBlockchainActivity ? (
            <div className="mt-6 space-y-3">
              {blockchainActivityItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-slate-200">
                    {item.value || "No data"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-center">
              <p className="text-lg font-semibold text-white">
                No verification data yet
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Immutable proof records will appear after blockchain verification
                data is connected.
              </p>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

export default Dashboard;
