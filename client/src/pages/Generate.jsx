import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import SectionHeading from "../components/SectionHeading.jsx";
import { generateContent } from "../services/aiService.js";

function Generate() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTakingLonger, setIsTakingLonger] = useState(false);

  async function handleGenerate() {
    const trimmedPrompt = prompt.trim();

    setError("");
    setContent("");
    setIsTakingLonger(false);

    if (!trimmedPrompt) {
      setError("Prompt is required");
      return;
    }

    const slowTimer = setTimeout(() => {
      setIsTakingLonger(true);
    }, 5000);

    try {
      setIsLoading(true);
      const generatedContent = await generateContent(trimmedPrompt);
      setContent(generatedContent);
    } catch (err) {
      setError("AI service is temporarily busy. Please try again.");
    } finally {
      clearTimeout(slowTimer);
      setIsLoading(false);
      setIsTakingLonger(false);
    }
  }

  function handleClear() {
    setPrompt("");
    setContent("");
    setError("");
    setIsTakingLonger(false);
  }

  async function handleCopy() {
    if (!content) return;
    await navigator.clipboard?.writeText(content);
  }

  function handleVerifyGeneratedContent() {
    if (!content) return;
    navigate("/verify", { state: { content } });
  }

  return (
    <section className="page-shell mx-auto max-w-5xl space-y-8">
      <SectionHeading
        badge="Generative AI"
        title="Create with AI"
        subtitle="Generate content and prepare it for verification."
      />

      <Card className="animate-slide-up">
        <label className="block text-sm font-medium text-slate-200">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows="10"
          className="input-glass mt-3 min-h-64 resize-y leading-7"
          placeholder="Enter your prompt here..."
          disabled={isLoading}
        />
        <div className="mt-3 flex items-center justify-between gap-4 text-xs text-slate-500">
          <span>Use a clear prompt for better verification context.</span>
          <span>{prompt.length} characters</span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? "Generating with AI..." : "Generate Content"} <span>→</span>
          </Button>

          <Button onClick={handleClear} variant="secondary" disabled={isLoading}>
            Clear
          </Button>
        </div>

        {isLoading && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" />
            {isTakingLonger
              ? "Trying a backup AI model..."
              : "Generating with AI..."}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-400/10 p-4 text-red-100">
            {error}
          </div>
        )}
      </Card>

      {content && (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.38fr]">
          <Card className="border-cyan-300/20 shadow-cyan-950/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge>Generated Content</Badge>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Ready for review
                </h2>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleCopy}>
                  Copy
                </Button>
                <Button variant="secondary" onClick={handleGenerate} disabled={isLoading}>
                  Regenerate
                </Button>
              </div>
            </div>
            <div className="mt-5 whitespace-pre-wrap rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 leading-7 text-cyan-50">
              {content}
            </div>
          </Card>

          <Card>
            <Badge>Next Step</Badge>
            <h3 className="mt-3 text-xl font-semibold text-white">
              Verify this content
            </h3>
            <p className="mt-3 leading-7 text-slate-300">
              Analyze this content to calculate an explainable Trust Score and
              review extracted claims.
            </p>
            <Button onClick={handleVerifyGeneratedContent} className="mt-6 w-full">
              Analyze Trust <span>→</span>
            </Button>
          </Card>
        </div>
      )}
    </section>
  );
}

export default Generate;
