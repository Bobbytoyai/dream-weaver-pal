import { useState, useEffect } from "react";
import { ArrowLeft, Brain, Zap, RefreshCw, BookOpen, AlertTriangle, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LearnResult {
  sessions_analyzed: number;
  total_qa_learned: number;
  total_gaps_filled: number;
  details: Array<{
    session_id: string;
    child_name: string;
    qa_inserted: number;
    gaps_filled: number;
    interests_found: number;
    patterns_found: number;
  }>;
}

export default function AutoLearnPanel({ onBack }: { onBack: () => void }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<LearnResult | null>(null);
  const [kbCount, setKbCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [recentLearnings, setRecentLearnings] = useState<any[]>([]);

  useEffect(() => {
    // Fetch stats
    supabase.from("knowledge_base").select("id", { count: "exact", head: true })
      .then(r => setKbCount(r.count ?? 0));
    supabase.from("child_sessions").select("id", { count: "exact", head: true })
      .gte("message_count", 4)
      .then(r => setSessionCount(r.count ?? 0));
    // Recent KB entries (auto-learned)
    supabase.from("knowledge_base").select("*")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(r => setRecentLearnings(r.data ?? []));
  }, [result]);

  const runBatchAnalysis = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("learn-from-conversations", {
        body: { mode: "batch" },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error === "rate_limited") { toast.error("Trop de requêtes, réessaie dans quelques secondes"); return; }
        if (data.error === "payment_required") { toast.error("Crédits IA épuisés"); return; }
        throw new Error(data.error);
      }
      setResult(data);
      toast.success(`🧠 ${data.total_qa_learned} Q&A apprises, ${data.total_gaps_filled} lacunes comblées !`);
    } catch (e: any) {
      console.error("Batch analysis error:", e);
      toast.error("Erreur d'analyse : " + (e.message || "inconnue"));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Button variant="ghost" onClick={onBack} className="text-white/70 p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-white">🧬 Auto-Learning IA</h1>
          <p className="text-[10px] text-white/40">Bobby apprend des conversations pour devenir plus intelligent</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] text-white/50 uppercase">Knowledge Base</span>
          </div>
          <p className="text-2xl font-bold text-white">{kbCount}</p>
          <p className="text-[10px] text-white/30">entrées totales</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] text-white/50 uppercase">Sessions</span>
          </div>
          <p className="text-2xl font-bold text-white">{sessionCount}</p>
          <p className="text-[10px] text-white/30">analysables (≥4 msgs)</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-2xl p-4 border border-violet-500/20 mb-5">
        <h3 className="text-sm font-bold text-white mb-2">🧠 Comment ça marche</h3>
        <div className="space-y-1.5 text-[11px] text-white/60">
          <div className="flex gap-2"><span className="text-violet-400">1.</span> L'IA lit toutes les conversations enfant ↔ Bobby</div>
          <div className="flex gap-2"><span className="text-violet-400">2.</span> Elle extrait : Q&A utiles, centres d'intérêt, patterns émotionnels</div>
          <div className="flex gap-2"><span className="text-violet-400">3.</span> Elle identifie les lacunes (questions sans bonne réponse)</div>
          <div className="flex gap-2"><span className="text-violet-400">4.</span> Tout est ajouté à la Knowledge Base automatiquement</div>
          <div className="flex gap-2"><span className="text-fuchsia-400">⚡</span> <strong className="text-white/80">Temps réel :</strong> chaque session est aussi analysée automatiquement à la fin</div>
        </div>
      </div>

      {/* Launch Button */}
      <Button
        onClick={runBatchAnalysis}
        disabled={running}
        className="w-full h-14 bg-gradient-to-r from-lime-600 to-emerald-600 hover:from-lime-700 hover:to-emerald-700 text-white font-bold text-base rounded-2xl mb-5"
      >
        {running ? (
          <span className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Analyse en cours… (peut prendre 30s)
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Lancer l'analyse batch
          </span>
        )}
      </Button>

      {/* Results */}
      {result && (
        <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20 mb-5 animate-in slide-in-from-bottom-2">
          <h3 className="text-sm font-bold text-emerald-300 mb-3">✅ Résultats de l'analyse</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{result.sessions_analyzed}</p>
              <p className="text-[9px] text-white/40">Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-cyan-300">{result.total_qa_learned}</p>
              <p className="text-[9px] text-white/40">Q&A apprises</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-300">{result.total_gaps_filled}</p>
              <p className="text-[9px] text-white/40">Lacunes comblées</p>
            </div>
          </div>
          {result.details.length > 0 && (
            <div className="space-y-1.5">
              {result.details.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] bg-white/5 rounded-xl px-3 py-1.5">
                  <span className="text-white/70 font-medium">{d.child_name}</span>
                  <span className="text-white/30">—</span>
                  {d.qa_inserted > 0 && <span className="text-cyan-300">+{d.qa_inserted} Q&A</span>}
                  {d.gaps_filled > 0 && <span className="text-amber-300">+{d.gaps_filled} gaps</span>}
                  {d.interests_found > 0 && <span className="text-pink-300">{d.interests_found} intérêts</span>}
                  {d.patterns_found > 0 && <span className="text-violet-300">{d.patterns_found} patterns</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent learned entries */}
      <div>
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Derniers apprentissages (KB)</h3>
        <div className="space-y-2">
          {recentLearnings.map((entry, i) => (
            <div key={entry.id || i} className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-start gap-2">
                <span className="text-sm">
                  {entry.emotion === "curious" ? "🤔" : entry.emotion === "happy" ? "😊" : entry.emotion === "calm" ? "😌" : "💡"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{entry.question}</p>
                  <p className="text-[10px] text-white/40 truncate mt-0.5">{entry.answer}</p>
                  <div className="flex gap-1 mt-1">
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">{entry.category}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">{entry.age_min}-{entry.age_max} ans</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">P{entry.priority}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {recentLearnings.length === 0 && (
            <p className="text-xs text-white/30 text-center py-8">Aucun apprentissage encore — lance l'analyse batch !</p>
          )}
        </div>
      </div>
    </div>
  );
}
