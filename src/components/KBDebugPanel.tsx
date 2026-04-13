/**
 * KB Debug Panel — Real-time semantic scoring visualization
 * Shows score breakdown for every KB match against a test query.
 */
import { useState, useCallback } from "react";
import { ArrowLeft, Search, Zap, Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { debugScoreQuery, type KBScoreBreakdown } from "@/lib/bobby/knowledgeQuery";

function ScoreBar({ label, value, max = 1, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-[70px] shrink-0 text-right" style={{ color: "var(--admin-text-dim)" }}>{label}</span>
      <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: "var(--admin-border)" }}>
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] w-[40px] font-mono tabular-nums" style={{ color: "var(--admin-text)" }}>
        {value.toFixed(3)}
      </span>
    </div>
  );
}

function ResultCard({ r, rank }: { r: KBScoreBreakdown; rank: number }) {
  const [open, setOpen] = useState(rank === 0);
  const isMatch = r.finalScore >= 0.12;

  return (
    <div
      className="rounded-xl p-3 transition-all border"
      style={{
        background: isMatch ? "var(--admin-card)" : "transparent",
        borderColor: isMatch ? (rank === 0 ? "rgba(34,197,94,0.4)" : "var(--admin-border)") : "var(--admin-border)",
        opacity: isMatch ? 1 : 0.5,
      }}
    >
      {/* Header */}
      <button onClick={() => setOpen(!open)} className="w-full text-left flex items-start gap-2">
        <span className="text-[11px] font-bold shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mt-0.5"
          style={{
            background: rank === 0 ? "rgba(34,197,94,0.2)" : "var(--admin-border)",
            color: rank === 0 ? "#22c55e" : "var(--admin-text-dim)",
          }}
        >
          {rank + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold leading-tight" style={{ color: "var(--admin-text)" }}>
            {r.question}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold"
              style={{ background: rank === 0 ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)", color: rank === 0 ? "#22c55e" : "#3b82f6" }}>
              {r.finalScore.toFixed(4)}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: "var(--admin-border)", color: "var(--admin-text-dim)" }}>
              P{r.priority}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: "var(--admin-border)", color: "var(--admin-text-dim)" }}>
              {r.category}
            </span>
            <span className="text-[9px]" style={{ color: "var(--admin-text-faint)" }}>
              {r.emotion}
            </span>
          </div>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 shrink-0 mt-1" style={{ color: "var(--admin-text-dim)" }} /> :
                <ChevronDown className="w-3.5 h-3.5 shrink-0 mt-1" style={{ color: "var(--admin-text-dim)" }} />}
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="mt-3 space-y-2 pl-8">
          {/* Score breakdown */}
          <ScoreBar label="Keywords" value={r.kwScore} color="bg-cyan-500" />
          <ScoreBar label="Question" value={r.qScore} color="bg-violet-500" />
          <ScoreBar label="Contenu" value={r.containment} color="bg-amber-500" />
          <ScoreBar label="Contexte" value={r.ctxBonus} max={0.15} color="bg-emerald-500" />
          <div className="border-t pt-2 mt-2" style={{ borderColor: "var(--admin-border)" }}>
            <ScoreBar label="Raw" value={r.rawScore} color="bg-blue-500" />
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] w-[70px] shrink-0 text-right" style={{ color: "var(--admin-text-dim)" }}>× Priority</span>
              <span className="text-[10px] font-mono" style={{ color: "var(--admin-text)" }}>{r.priorityFactor.toFixed(2)}</span>
            </div>
            <ScoreBar label="Final" value={r.finalScore} color={r.finalScore >= 0.12 ? "bg-green-500" : "bg-red-500"} />
          </div>

          {/* Answer preview */}
          <div className="mt-2 p-2 rounded-lg text-[11px] leading-relaxed" style={{ background: "var(--admin-border)", color: "var(--admin-text-dim)" }}>
            {r.answer.slice(0, 200)}{r.answer.length > 200 ? "…" : ""}
          </div>

          {/* Keywords */}
          <div className="flex gap-1 flex-wrap mt-1">
            {r.keywords.map((k, i) => (
              <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-md"
                style={{
                  background: r.inputTokens.some(t => k.toLowerCase().includes(t) || t.includes(k.toLowerCase())) ? "rgba(34,197,94,0.15)" : "var(--admin-border)",
                  color: r.inputTokens.some(t => k.toLowerCase().includes(t) || t.includes(k.toLowerCase())) ? "#22c55e" : "var(--admin-text-faint)",
                }}>
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KBDebugPanel({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [age, setAge] = useState(7);
  const [results, setResults] = useState<KBScoreBreakdown[]>([]);
  const [context, setContext] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTokens, setExpandedTokens] = useState<string[]>([]);
  const [inputTokens, setInputTokens] = useState<string[]>([]);
  const [searchTime, setSearchTime] = useState(0);

  const runQuery = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    const t0 = performance.now();
    try {
      const res = await debugScoreQuery(query, age, 30);
      setResults(res.results);
      setContext(res.context);
      if (res.results.length > 0) {
        setExpandedTokens(res.results[0].expandedTokens);
        setInputTokens(res.results[0].inputTokens);
      }
      setSearchTime(performance.now() - t0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, age]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") runQuery();
  };

  const topMatch = results[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onBack} className="p-2" style={{ color: "var(--admin-text-dim)" }}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Brain className="w-5 h-5 text-emerald-400" />
        <div>
          <h2 className="text-[15px] font-bold" style={{ color: "var(--admin-text)" }}>🔍 KB Scoring Debug</h2>
          <p className="text-[10px]" style={{ color: "var(--admin-text-dim)" }}>Visualise le score sémantique de chaque match en temps réel</p>
        </div>
      </div>

      {/* Query input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--admin-text-faint)" }} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tape une question enfant... ex: c'est quoi un trou noir"
            className="pl-9 text-[13px]"
            style={{ background: "var(--admin-card)", borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
          />
        </div>
        <Button onClick={runQuery} disabled={loading || !query.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          Tester
        </Button>
      </div>

      {/* Age slider */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold" style={{ color: "var(--admin-text-dim)" }}>Âge enfant</span>
        <Slider value={[age]} onValueChange={([v]) => setAge(v)} min={3} max={12} step={1} className="flex-1" />
        <span className="text-[13px] font-bold font-mono w-8 text-center" style={{ color: "var(--admin-text)" }}>{age}</span>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
              <p className="text-[20px] font-bold" style={{ color: "#22c55e" }}>{results.length}</p>
              <p className="text-[9px]" style={{ color: "var(--admin-text-dim)" }}>Matches</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
              <p className="text-[20px] font-bold" style={{ color: topMatch ? "#3b82f6" : "var(--admin-text-dim)" }}>
                {topMatch ? topMatch.finalScore.toFixed(3) : "—"}
              </p>
              <p className="text-[9px]" style={{ color: "var(--admin-text-dim)" }}>Top Score</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
              <p className="text-[20px] font-bold" style={{ color: "var(--admin-text)" }}>{searchTime.toFixed(0)}<span className="text-[10px]">ms</span></p>
              <p className="text-[9px]" style={{ color: "var(--admin-text-dim)" }}>Temps</p>
            </div>
          </div>

          {/* Input tokens & expansion */}
          <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
            <div>
              <p className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: "var(--admin-text-dim)" }}>Tokens extraits</p>
              <div className="flex gap-1 flex-wrap">
                {inputTokens.map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 font-mono">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: "var(--admin-text-dim)" }}>
                Expansion sémantique <span className="text-emerald-400">+{expandedTokens.length - inputTokens.length} mots</span>
              </p>
              <div className="flex gap-1 flex-wrap max-h-[80px] overflow-y-auto">
                {expandedTokens.filter(t => !inputTokens.includes(t)).slice(0, 40).map((t, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400/70 font-mono">{t}</span>
                ))}
              </div>
            </div>
            {context.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: "var(--admin-text-dim)" }}>Contexte conversationnel</p>
                <div className="flex gap-1 flex-wrap">
                  {context.map((t, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-400/70 font-mono">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Threshold indicator */}
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 h-px" style={{ background: "var(--admin-border)" }} />
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              Seuil match = 0.120
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--admin-border)" }} />
          </div>

          {/* Result list */}
          <div className="space-y-2">
            {results.map((r, i) => (
              <ResultCard key={r.id} r={r} rank={i} />
            ))}
          </div>
        </>
      )}

      {results.length === 0 && query && !loading && (
        <div className="text-center py-8" style={{ color: "var(--admin-text-dim)" }}>
          <p className="text-[13px]">Aucun match trouvé</p>
          <p className="text-[10px] mt-1">Essaie une autre question ou ajuste l'âge</p>
        </div>
      )}
    </div>
  );
}