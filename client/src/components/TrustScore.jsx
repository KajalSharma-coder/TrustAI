const categories = ["Accuracy", "Reliability", "Consistency", "Integrity"];

function TrustScore({ score = null }) {
  const hasScore = typeof score === "number";
  const displayScore = hasScore ? score : "--";
  const progress = hasScore ? Math.min(Math.max(score, 0), 100) : 0;

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
                {hasScore ? "High Trust" : "No score yet"}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Verification data will appear after trust scoring is connected.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {categories.map((category) => (
              <div
                key={category}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
              >
                <p className="text-sm font-medium text-slate-200">{category}</p>
                <p className="mt-1 text-xs text-slate-500">Pending</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrustScore;
