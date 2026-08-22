import Badge from "../components/Badge.jsx";
import Card from "../components/Card.jsx";
import SectionHeading from "../components/SectionHeading.jsx";
import TrustScore from "../components/TrustScore.jsx";

const cards = [
  { title: "Trust Score", value: "--", detail: "No score data yet" },
  { title: "Documents Verified", value: "--", detail: "No verification data yet" },
  { title: "Blockchain Proofs", value: "--", detail: "No proof data yet" },
  { title: "Tampered Content", value: "--", detail: "No integrity data yet" },
];

function Dashboard() {
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
        <TrustScore />

        <Card>
          <Badge>Recent Verifications</Badge>
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-center">
            <p className="text-lg font-semibold text-white">No verification data yet</p>
            <p className="mt-2 text-sm text-slate-400">
              Verified content activity will appear here after real verification
              data is available.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Badge>Verification Status</Badge>
          <div className="mt-6 space-y-3">
            {["Awaiting content", "Trust scoring pending", "Blockchain proof pending"].map((item) => (
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
        </Card>

        <Card>
          <Badge>Blockchain Activity</Badge>
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-center">
            <p className="text-lg font-semibold text-white">No verification data yet</p>
            <p className="mt-2 text-sm text-slate-400">
              Immutable proof records will appear after blockchain verification
              data is connected.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default Dashboard;
