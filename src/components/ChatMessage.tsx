import companionAvatar from "@/assets/companion-avatar.png";

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  isTyping?: boolean;
}

const ChatMessage = ({ content, isUser, isTyping }: ChatMessageProps) => {
  return (
    <div className={`flex gap-3 mb-4 bounce-in ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <img
          src={companionAvatar}
          alt="Buddy"
          width={40}
          height={40}
          className="rounded-full w-10 h-10 flex-shrink-0 mt-1"
        />
      )}
      <div
        className={`max-w-[80%] px-5 py-3 text-base leading-relaxed ${
          isUser
            ? "chat-bubble-user"
            : "chat-bubble-companion"
        }`}
      >
        {isTyping ? (
          <div className="flex gap-1.5 py-1 px-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
            <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" style={{ animationDelay: "0.2s" }} />
            <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" style={{ animationDelay: "0.4s" }} />
          </div>
        ) : (
          <span className={isUser ? "text-primary-foreground" : "text-black"}>{content}</span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
