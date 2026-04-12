import { useState, useEffect } from "react";
import { X, Save, Trash2, Copy, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────
export type DetailItemType = "interaction" | "store" | "kb" | "qa" | "blague" | "histoire" | "chanson" | "quiz" | "generic";

const AI_GENERATABLE: DetailItemType[] = ["blague", "quiz", "histoire", "qa"];

export interface DetailField {
  key: string;
  label: string;
  value: any;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "tags" | "readonly";
  options?: string[];
  placeholder?: string;
}

export interface DetailItem {
  type: DetailItemType;
  title: string;
  emoji: string;
  id?: string;
  fields: DetailField[];
  meta?: { label: string; value: string; color?: string }[];
}

interface Props {
  item: DetailItem | null;
  onClose: () => void;
  onSave?: (type: DetailItemType, id: string | undefined, values: Record<string, any>) => Promise<void>;
  onDelete?: (type: DetailItemType, id: string) => void;
  onDuplicate?: (type: DetailItemType, values: Record<string, any>) => void;
}

export default function AdminDetailDialog({ item, onClose, onSave, onDelete, onDuplicate }: Props) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!item) return;
    const v: Record<string, any> = {};
    item.fields.forEach(f => { v[f.key] = f.value; });
    setValues(v);
    setDirty(false);
  }, [item]);

  if (!item) return null;

  const updateValue = (key: string, val: any) => {
    setValues(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    await onSave(item.type, item.id, values);
    setSaving(false);
    setDirty(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-[hsl(240,30%,12%)] border border-white/15 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <span className="text-3xl">{item.emoji}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{item.title}</h2>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {item.meta?.map((m, i) => (
                <span key={i} className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${m.color || "bg-white/10 text-white/50"}`}>
                  {m.label}: {m.value}
                </span>
              ))}
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium uppercase">
                {item.type}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {item.fields.map(field => (
            <div key={field.key}>
              <label className="text-[11px] text-white/50 font-semibold mb-1 block uppercase tracking-wider">
                {field.label}
              </label>

              {field.type === "readonly" && (
                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 whitespace-pre-wrap">
                  {values[field.key] || "—"}
                </div>
              )}

              {field.type === "text" && (
                <Input
                  value={values[field.key] || ""}
                  onChange={e => updateValue(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="bg-white/8 border-white/15 text-white text-sm"
                />
              )}

              {field.type === "textarea" && (
                <Textarea
                  value={values[field.key] || ""}
                  onChange={e => updateValue(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="bg-white/8 border-white/15 text-white text-sm resize-none"
                />
              )}

              {field.type === "number" && (
                <Input
                  type="number"
                  value={values[field.key] ?? 0}
                  onChange={e => updateValue(field.key, Number(e.target.value))}
                  className="bg-white/8 border-white/15 text-white text-sm w-24"
                />
              )}

              {field.type === "boolean" && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!values[field.key]}
                    onCheckedChange={v => updateValue(field.key, v)}
                  />
                  <span className="text-xs text-white/50">{values[field.key] ? "Oui" : "Non"}</span>
                </div>
              )}

              {field.type === "select" && (
                <Select value={values[field.key] || ""} onValueChange={v => updateValue(field.key, v)}>
                  <SelectTrigger className="bg-white/8 border-white/15 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              {field.type === "tags" && (
                <div>
                  <Input
                    value={Array.isArray(values[field.key]) ? values[field.key].join(", ") : ""}
                    onChange={e => updateValue(field.key, e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean))}
                    placeholder="tag1, tag2, tag3"
                    className="bg-white/8 border-white/15 text-white text-sm"
                  />
                  {Array.isArray(values[field.key]) && values[field.key].length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {values[field.key].map((t: string, i: number) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-2 items-center">
          {onSave && (
            <Button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {saving ? "…" : <><Save className="w-4 h-4 mr-1.5" /> Enregistrer</>}
            </Button>
          )}
          {onDuplicate && (
            <Button
              variant="ghost"
              onClick={() => onDuplicate(item.type, values)}
              className="text-white/40 hover:text-white"
              title="Dupliquer"
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}
          {onDelete && item.id && (
            <Button
              variant="ghost"
              onClick={() => onDelete(item.type, item.id!)}
              className="text-red-400/50 hover:text-red-400"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
