const riskStyles = {
  LOW: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  MEDIUM: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  HIGH: "border-red-300/30 bg-red-300/10 text-red-100",
};

function RiskBadge({ value }) {
  const riskLevel = typeof value === "string" ? value.toUpperCase() : "MEDIUM";
  const className = riskStyles[riskLevel] || riskStyles.MEDIUM;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${className}`}
    >
      {riskLevel} Risk
    </span>
  );
}

export default RiskBadge;
