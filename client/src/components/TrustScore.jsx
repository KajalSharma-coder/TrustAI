import RiskBadge from "./RiskBadge.jsx";

const defaultCategories = [
  { key: "accuracy", label: "Accuracy", value: null },
  { key: "reliability", label: "Reliability", value: null },
  { key: "consistency", label: "Consistency", value: null },
  { key: "evidenceQuality", label: "Evidence Quality", value: null },
];

function TrustScore({ score = null, riskLevel, summary, categories = null }) {
  const hasScore = typeof score === "number";
  const displayScore = hasScore ? score : "--";
  const progress = hasScore ? Math.min(Math.max(score, 0), 100) : 0;
  const categoryItems = categories
    ? defaultCategories.map((category) => ({
        ...category,
        value: categories[category.key],
      }))
    : defaultCategories;

  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div
          className="grid h-36 w-36 place-items-center rounded-full"
          style={{
            background: `conic-gradient(rgb(34 211 238) ${progress}%, rgba(255,255,255,0.08) ${progress}%)`,
          }}
        >
          <div className="grid h-28 w-28 place-items-center rounded-full border border-white/10 bg-slate-950/90 text-center">
            <div>
              <p className="text-3xl font-bold text-white">{displayScore}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Trust Score
              </p>
            </div>
          </div>
        </div>

        <div className="w-full flex-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Trust Score
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {summary ||
                  "Verification data will appear after trust scoring is connected."}
              </p>
            </div>
            {hasScore && <RiskBadge value={riskLevel} />}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {categoryItems.map((category) => (
              <div
                key={category.label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-200">
                    {category.label}
                  </p>
                  <p className="text-sm font-bold text-white">
                    {typeof category.value === "number" ? category.value : "--"}
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan-300"
                    style={{
                      width:
                        typeof category.value === "number"
                          ? `${Math.min(Math.max(category.value, 0), 100)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrustScore;
