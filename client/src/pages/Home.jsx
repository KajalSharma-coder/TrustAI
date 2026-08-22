import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import SectionHeading from "../components/SectionHeading.jsx";

const flowSteps = [
  "AI Generation",
  "AI Analysis",
  "Trust Score",
  "Blockchain Proof",
];

const reasons = [
  {
    title: "AI Analysis",
    text: "Analyze generated content for quality and reliability.",
  },
  {
    title: "Tamper Detection",
    text: "Detect whether verified content has been modified.",
  },
  {
    title: "Blockchain Proof",
    text: "Create an immutable proof of the original content.",
  },
];

function Home() {
  return (
    <div className="page-shell space-y-20">
      <section className="grid min-h-[74vh] items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-slide-up">
          <Badge>AI + Blockchain Trust Layer</Badge>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Don't Just Generate AI.
            <span className="block gradient-text">Verify It.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            TrustAI verifies AI-generated content, analyzes its reliability, and
            creates a blockchain-backed proof of integrity.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button to="/generate">Generate with AI <span>→</span></Button>
            <Button to="/verify" variant="secondary">
              Verify Content <span>→</span>
            </Button>
          </div>
        </div>

        <div className="glass-panel animate-slide-up p-6 animation-delay-100">
          <div className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/10 via-slate-950/70 to-fuchsia-400/10 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-cyan-200">
                  Trust Flow
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Proof pipeline
                </h2>
              </div>
              <span className="rounded-full border border-cyan-300/20 px-3 py-1 text-sm text-cyan-100">
                Live UI
              </span>
            </div>

            <div className="mt-8 grid gap-4">
              {flowSteps.map((step, index) => (
                <div key={step}>
                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/15 text-sm font-bold text-cyan-100">
                      0{index + 1}
                    </span>
                    <span className="font-semibold text-white">{step}</span>
                  </div>
                  {index < flowSteps.length - 1 && (
                    <div className="ml-5 h-5 w-px bg-gradient-to-b from-cyan-300/70 to-fuchsia-300/50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading
          badge="Why TrustAI?"
          title="Confidence signals for AI content"
          subtitle="A clean verification layer for teams that need to prove where content came from and whether it changed."
          align="center"
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {reasons.map((reason) => (
            <Card key={reason.title}>
              <div className="mb-5 h-12 w-12 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 shadow-lg shadow-cyan-950/30" />
              <h3 className="text-xl font-semibold text-white">{reason.title}</h3>
              <p className="mt-3 leading-7 text-slate-300">{reason.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="glass-panel p-8 text-center sm:p-10">
        <h2 className="text-3xl font-bold text-white">Ready to verify AI?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-300">
          Start with generation now, then move into the verification workflow as
          the proof layer comes online.
        </p>
        <div className="mt-7">
          <Button to="/verify">Start Verification <span>→</span></Button>
        </div>
      </section>
    </div>
  );
}

export default Home;
