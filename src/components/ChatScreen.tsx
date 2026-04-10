import { useState, useRef, useEffect } from "react";
import { Send, Mic } from "lucide-react";
import { toast } from "sonner";
import ChatMessage from "./ChatMessage";
import ModeSelector, { type ChatMode } from "./ModeSelector";
import { streamChat } from "@/lib/streamChat";
import companionAvatar from "@/assets/companion-avatar.png";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
}

type AiMsg = { role: "user" | "assistant"; content: string };

interface ChatScreenProps {
  childName: string;
  childAge: number;
  onSwitchToVoice?: () => void;
}

const getInitialGreeting = (name: string, age: number): string => {
  if (age <= 7) {
    return `Youpi, ${name} ! 🎉 Je suis trop content de te rencontrer ! Je suis Buddy ! Tu veux jouer, entendre une histoire, ou juste discuter ?`;
  } else if (age <= 10) {
    return `Salut ${name} ! 😊 Enchanté ! Je suis Buddy, ton compagnon IA. Je peux raconter des histoires, jouer à des jeux ou t'apprendre des trucs cool. Qu'est-ce qui te tente ?`;
  }
  return `Hey ${name} ! 👋 Je suis Buddy, ton compagnon IA. Histoires, jeux, apprentissage ou discussion… t'es d'humeur pour quoi ?`;
};

const ChatScreen = ({ childName, childAge, onSwitchToVoice }: ChatScreenProps) => {
  const initialGreeting = getInitialGreeting(childName, childAge);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", content: initialGreeting, isUser: false },
  ]);
  const [conversationHistory, setConversationHistory] = useState<AiMsg[]>([
    { role: "assistant", content: initialGreeting },
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleModeChange = (newMode: ChatMode) => {
    setMode(newMode);
    if (newMode !== "chat" && newMode !== mode) {
      const modeMessages: Record<string, string> = {
        story: `📖 C'est l'heure des histoires, ${childName} ! Tu veux une histoire d'aventure, drôle ou magique ?`,
        game: `🎮 On joue ! Tu veux une devinette, un quiz ou un jeu d'imagination, ${childName} ?`,
        learn: `🧠 On apprend un truc cool, ${childName} ! Qu'est-ce qui te rend curieux ?`,
      };
      const msg = modeMessages[newMode] || "";
      if (msg) {
        setMessages((prev) => [...prev, { id: Date.now().toString(), content: msg, isUser: false }]);
        setConversationHistory((prev) => [...prev, { role: "assistant", content: msg }]);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMsg: Message = { id: Date.now().toString(), content: userText, isUser: true };
    const newHistory: AiMsg[] = [...conversationHistory, { role: "user", content: userText }];

    setMessages((prev) => [...prev, userMsg]);
    setConversationHistory(newHistory);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const assistantId = (Date.now() + 1).toString();

    try {
      await streamChat({
        messages: newHistory,
        childName,
        childAge,
        mode,
        onDelta: (chunk) => {
          assistantSoFar += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last?.isUser && last?.id === assistantId) {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
            }
            return [...prev, { id: assistantId, content: assistantSoFar, isUser: false }];
          });
        },
        onDone: () => {
          setIsLoading(false);
          setConversationHistory((prev) => [...prev, { role: "assistant", content: assistantSoFar }]);
        },
        onError: (error) => {
          setIsLoading(false);
          toast.error(error);
        },
      });
    } catch {
      setIsLoading(false);
      toast.error("Oops! Something went wrong. Try again? 🔄");
    }

    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
        <img src={companionAvatar} alt="Buddy" width={44} height={44} className="rounded-full" />
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-foreground">Buddy</h2>
          <p className="text-xs text-success font-semibold">● Online</p>
        </div>
        {onSwitchToVoice ? (
          <button
            onClick={onSwitchToVoice}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all"
          >
            <Mic className="w-4 h-4" />
            Voice
          </button>
        ) : (
          <span className="text-2xl">🌟</span>
        )}
      </div>

      {/* Mode Selector */}
      <ModeSelector activeMode={mode} onModeChange={handleModeChange} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} content={msg.content} isUser={msg.isUser} />
        ))}
        {isLoading && messages[messages.length - 1]?.isUser && (
          <ChatMessage content="" isUser={false} isTyping />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-card border-t border-border">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Dis quelque chose, ${childName}...`}
            disabled={isLoading}
            className="flex-1 rounded-full border-2 border-border bg-background px-5 py-3 text-base font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
