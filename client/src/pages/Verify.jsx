import { useState } from "react";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import SectionHeading from "../components/SectionHeading.jsx";

const processSteps = ["Content", "Hash", "AI Analysis", "Blockchain Check", "Trust Score"];

function Verify() {
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setFileName(file ? file.name : "");
    setResult("");
  }

  function handleFileDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    setIsDragging(false);
    setFileName(file ? file.name : "");
    setResult("");
  }

  function handleVerify() {
    setResult(
      fileName
        ? `Placeholder result: ${fileName} is ready for future verification.`
        : "Choose a file first to preview the verification flow."
    );
  }

  return (
    <section className="page-shell mx-auto max-w-5xl space-y-8">
      <SectionHeading
        badge="Verification"
        title="Verify AI Content"
        subtitle="Check authenticity, integrity and trustworthiness."
      />

      <Card className="animate-slide-up">
        <label
          className={`block cursor-pointer rounded-3xl border border-dashed p-8 text-center transition duration-300 ${
            isDragging
              ? "border-cyan-300 bg-cyan-300/10 shadow-lg shadow-cyan-950/30"
              : "border-white/15 bg-slate-950/45 hover:border-cyan-300/50 hover:bg-cyan-300/5"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
        >
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-3xl text-cyan-100">
            ↑
          </span>
          <span className="mt-5 block text-2xl font-semibold text-white">
            Drop your file here
          </span>
          <span className="mt-2 block text-slate-400">
            or choose a file to preview the verification flow
          </span>
          <span className="mt-4 block text-xs uppercase tracking-[0.2em] text-slate-500">
            TXT, PDF, DOC, JSON
          </span>
          <input
            type="file"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        {fileName && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-200">
            Selected file: <span className="font-semibold text-cyan-100">{fileName}</span>
          </div>
        )}

        <Button onClick={handleVerify} className="mt-5">
          Verify Content <span>→</span>
        </Button>

        {result && (
          <div className="mt-6 rounded-2xl border border-sky-500/30 bg-sky-400/10 p-4 text-sky-100">
            {result}
          </div>
        )}
      </Card>

      <Card>
        <Badge>Verification Process</Badge>
        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {processSteps.map((step, index) => (
            <div key={step} className="relative">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-sm font-bold text-cyan-100">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm font-semibold text-white">{step}</p>
              </div>
              {index < processSteps.length - 1 && (
                <div className="mx-auto h-5 w-px bg-gradient-to-b from-cyan-300/70 to-fuchsia-300/50 md:absolute md:left-full md:top-1/2 md:h-px md:w-4 md:-translate-y-1/2 md:bg-gradient-to-r" />
              )}
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm leading-6 text-slate-400">
          Trust Score and blockchain results will appear here when verification
          data is available.
        </p>
      </Card>
    </section>
  );
}

export default Verify;
