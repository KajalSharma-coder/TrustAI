const statusStyles = {
  SUPPORTED: {
    label: "Supported",
    border: "border-emerald-300/20",
    badge: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  },
  CONTRADICTED: {
    label: "Contradicted",
    border: "border-red-300/25",
    badge: "border-red-300/30 bg-red-300/10 text-red-100",
  },
  NEEDS_VERIFICATION: {
    label: "Needs Verification",
    border: "border-amber-300/25",
    badge: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  },
};

function ClaimCard({ claim }) {
  const status = claim?.status || "NEEDS_VERIFICATION";
  const styles = statusStyles[status] || statusStyles.NEEDS_VERIFICATION;

  return (
    <article className={`rounded-2xl border bg-white/[0.04] p-5 ${styles.border}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Claim
          </p>
          <p className="mt-2 leading-7 text-slate-100">{claim.claim}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${styles.badge}`}
        >
          {styles.label}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[0.28fr_1fr]">
        <div>
          <p className="text-xs text-slate-500">Confidence</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {claim.confidence}%
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Reason</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{claim.reason}</p>
        </div>
      </div>
    </article>
  );
}

export default ClaimCard;
