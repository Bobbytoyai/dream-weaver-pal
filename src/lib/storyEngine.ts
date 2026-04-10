/**
 * Story Engine — fetches templates and generates personalized stories.
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "./eventBus";

export interface StoryTemplate {
  id: string;
  title: string;
  theme: string;
  templateText: string;
  ageMin: number;
  ageMax: number;
  duration: string;
  interactive: boolean;
}

let cachedTemplates: StoryTemplate[] | null = null;

/** Fetch all story templates */
export async function getStoryTemplates(): Promise<StoryTemplate[]> {
  if (cachedTemplates) return cachedTemplates;

  const { data, error } = await supabase
    .from("story_templates")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("Failed to load stories:", error);
    return [];
  }

  cachedTemplates = data.map(d => ({
    id: d.id,
    title: d.title,
    theme: d.theme,
    templateText: d.template_text,
    ageMin: d.age_min,
    ageMax: d.age_max,
    duration: d.duration,
    interactive: d.interactive,
  }));

  return cachedTemplates;
}

/** Get stories filtered by theme */
export async function getStoriesByTheme(theme: string): Promise<StoryTemplate[]> {
  const all = await getStoryTemplates();
  return all.filter(s => s.theme === theme);
}

/** Get a random story, optionally filtered by theme and age */
export async function getRandomStory(theme?: string, childAge?: number): Promise<StoryTemplate | null> {
  let stories = await getStoryTemplates();
  if (theme) stories = stories.filter(s => s.theme === theme);
  if (childAge) stories = stories.filter(s => childAge >= s.ageMin && childAge <= s.ageMax);
  if (stories.length === 0) return null;
  return stories[Math.floor(Math.random() * stories.length)];
}

/**
 * Stream a personalized story via the generate-story edge function.
 * Calls onSentence for each complete sentence for TTS pipeline.
 */
export async function streamStory({
  template,
  childName,
  childAge,
  theme,
  onSentence,
  onDone,
  onError,
  signal,
}: {
  template?: StoryTemplate;
  childName: string;
  childAge: number;
  theme: string;
  onSentence: (sentence: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}) {
  eventBus.emit({ type: "STORY_START", theme, title: template?.title || "Histoire originale" });

  try {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-story`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          template: template?.templateText,
          childName,
          childAge,
          theme,
        }),
        signal,
      }
    );

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      onError(data.error || "story_error");
      return;
    }

    if (!resp.body) {
      onError("no_response");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let fullText = "";
    let sentenceBuffer = "";

    const flushSentence = () => {
      const trimmed = sentenceBuffer.trim();
      if (trimmed.length > 3) {
        onSentence(trimmed);
        fullText += (fullText ? " " : "") + trimmed;
      }
      sentenceBuffer = "";
    };

    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            sentenceBuffer += content;
            if (/[.!?…]\s*$/.test(sentenceBuffer)) flushSentence();
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    flushSentence();
    onDone(fullText);
    eventBus.emit({ type: "STORY_END" });
  } catch (e: any) {
    if (e.name !== "AbortError") onError(e.message || "stream_error");
  }
}
