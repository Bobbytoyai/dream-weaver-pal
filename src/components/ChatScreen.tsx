import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ModeSelector, { type ChatMode } from "./ModeSelector";
import companionAvatar from "@/assets/companion-avatar.png";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
}

interface ChatScreenProps {
  childName: string;
  childAge: number;
}

const getModeGreeting = (mode: ChatMode, name: string): string => {
  switch (mode) {
    case "story":
      return `📖 Story time, ${name}! Want me to tell you an adventure story, a funny story, or a magical one?`;
    case "game":
      return `🎮 Game time! Want to play a guessing game, a riddle challenge, or a quiz, ${name}?`;
    case "learn":
      return `🧠 Let's learn something cool, ${name}! What are you curious about? Animals, space, nature, or something else?`;
    default:
      return "";
  }
};

const getInitialGreeting = (name: string, age: number): string => {
  if (age <= 7) {
    return `Yay, ${name}! 🎉 I'm so happy to meet you! I'm Buddy! Want to play a game, hear a story, or just chat?`;
  } else if (age <= 10) {
    return `Hey ${name}! 😊 Great to meet you! I'm Buddy, your AI companion. I can tell stories, play games, or help you learn cool stuff. What sounds fun?`;
  }
  return `Hey ${name}! 👋 I'm Buddy, your AI companion. I'm here for stories, games, learning, or just chatting. What are you in the mood for?`;
};

const ChatScreen = ({ childName, childAge }: ChatScreenProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", content: getInitialGreeting(childName, childAge), isUser: false },
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleModeChange = (newMode: ChatMode) => {
    setMode(newMode);
    if (newMode !== "chat") {
      const greeting = getModeGreeting(newMode, childName);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), content: greeting, isUser: false },
      ]);
    }
  };

  const getCompanionResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();

    // Emotional detection
    if (lower.match(/sad|upset|cry|unhappy|miss/)) {
      return `Oh, ${childName}… I'm sorry you feel that way. 💙 It's okay to feel sad sometimes. Want me to tell you a cozy story to cheer you up?`;
    }
    if (lower.match(/scared|afraid|fear|nightmare/)) {
      return `Hey, it's okay, ${childName}. You're safe right here with me. 🌟 Want to hear a story about a brave little hero? It might help!`;
    }
    if (lower.match(/bored|boring|nothing to do/)) {
      return `Hmm, let's fix that! 🎮 How about a riddle? Here goes: I have hands but can't clap. What am I? 🤔`;
    }
    if (lower.match(/happy|excited|great|awesome|yay/)) {
      return `Woohoo! That makes me happy too! 🎉 Your energy is amazing, ${childName}!`;
    }

    // Mode-specific responses
    if (mode === "story") {
      return `Once upon a time, in a magical forest, ${childName} found a glowing path between the trees… 🌲✨ Do you follow the path, or do you climb the tallest tree to look around?`;
    }
    if (mode === "game") {
      return `Okay, here's one! 🧩 I'm thinking of something that's round, orange, and you can eat it. What is it? Hint: it's a fruit!`;
    }
    if (mode === "learn") {
      return `Oh, great question! Did you know that octopuses have THREE hearts? 🐙💙💙💙 Two pump blood to their gills, and one pumps it to the rest of the body. Cool, right?`;
    }

    // Default conversational
    const responses = [
      `That's really cool, ${childName}! Tell me more! 😊`,
      `Wow, I love that! What else is on your mind? ✨`,
      `Hmm, interesting! Do you want to play a game, hear a story, or learn something new? 🎮📖🧠`,
      `Oh! That reminds me of something fun! Do you want to hear a fun fact? 🌟`,
      `Nice, ${childName}! You're full of great ideas! What should we do next? 🚀`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate response delay
    setTimeout(() => {
      setIsTyping(false);
      const response = getCompanionResponse(userMsg.content);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), content: response, isUser: false },
      ]);
    }, 1000 + Math.random() * 500);

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
        <span className="text-2xl">🌟</span>
      </div>

      {/* Mode Selector */}
      <ModeSelector activeMode={mode} onModeChange={handleModeChange} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} content={msg.content} isUser={msg.isUser} />
        ))}
        {isTyping && <ChatMessage content="" isUser={false} isTyping />}
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
            placeholder={`Say something, ${childName}...`}
            className="flex-1 rounded-full border-2 border-border bg-background px-5 py-3 text-base font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
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
