import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Send, Mic, Sparkles, AlertCircle } from "lucide-react";
import { formatRWF } from "@/lib/loan";

interface AIAssistantProps {
  loans: any[];
  payments: any[];
  docs: any[];
}

interface Message {
  sender: "user" | "ai";
  text: string;
}

export function AIAssistant({ loans, payments, docs }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "ai", text: "Hi! Ask me anything about the platform metrics or pending items." },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Handle query response
  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInput("");
    setIsTyping(true);

    // AI logic response
    setTimeout(() => {
      let reply = "";
      const lower = userText.toLowerCase();

      const total = loans.length;
      const review = loans.filter((l) => l.status === "submitted" || l.status === "under_review").length;
      const approved = loans.filter((l) => ["approved", "fee_paid", "in_progress", "completed"].includes(l.status)).length;
      const rejected = loans.filter((l) => l.status === "rejected").length;
      const pendingPayments = loans.filter((l) => l.status === "verifying_payment").length;
      const pendingDocs = docs.filter((d) => d.status === "pending").length;
      const fees = payments
        .filter((p) => p.payment_type === "trust_fee" && p.status === "paid")
        .reduce((s, p) => s + Number(p.amount ?? 0), 0);

      if (lower.includes("rejection") || lower.includes("reject")) {
        const rate = total ? Math.round((rejected / total) * 100) : 0;
        reply = `The platform's current rejection rate is ${rate}%, with a total of ${rejected} rejected files.`;
      } else if (lower.includes("review") || lower.includes("awaiting") || lower.includes("submitted")) {
        reply = `There are currently ${review} applications awaiting review. You can review them in the Applications tab.`;
      } else if (lower.includes("payment") || lower.includes("verify") || lower.includes("document") || lower.includes("doc")) {
        reply = `We have ${pendingPayments} payments and ${pendingDocs} documents pending verification.`;
      } else if (lower.includes("revenue") || lower.includes("fee") || lower.includes("profit") || lower.includes("collected")) {
        reply = `We've collected ${formatRWF(fees)} in trust fees from approved applications.`;
      } else if (lower.includes("approved") || lower.includes("active")) {
        reply = `There are ${approved} approved/active files progressing through their financing timeline.`;
      } else if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey")) {
        reply = "Hello! I am your WePay AI Assistant. I can summarize queues, calculate rejection rates, or check trust fee volumes.";
      } else {
        reply = `Currently, there are ${total} total applications (${approved} approved, ${review} in review, ${rejected} rejected) with ${formatRWF(fees)} in collected fees.`;
      }

      setMessages((prev) => [...prev, { sender: "ai", text: reply }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-sm border border-border bg-card overflow-hidden">
      <style>{`
        @keyframes floatSphere {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes spherePulse {
          0% { box-shadow: inset -6px -6px 15px rgba(0,0,0,0.45), inset 6px 6px 15px rgba(255,255,255,0.4), 0 8px 18px rgba(37,99,235,0.25); }
          50% { box-shadow: inset -6px -6px 15px rgba(0,0,0,0.45), inset 6px 6px 15px rgba(255,255,255,0.4), 0 12px 28px rgba(37,99,235,0.45); }
          100% { box-shadow: inset -6px -6px 15px rgba(0,0,0,0.45), inset 6px 6px 15px rgba(255,255,255,0.4), 0 8px 18px rgba(37,99,235,0.25); }
        }
      `}</style>
      
      <div>
        <h3 className="text-sm font-bold text-foreground">AI Assistant</h3>
        <p className="text-xs text-muted-foreground">Ask anything about platform data</p>
      </div>

      {/* Floating Glassmorphic Sphere Area */}
      <div className="flex flex-col items-center justify-center py-4 bg-accent/30 rounded-xl relative border border-accent/40">
        <div className="absolute top-2 right-2 text-primary">
          <Sparkles className="h-4 w-4 animate-pulse" />
        </div>
        <div 
          className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 border border-white/20"
          style={{
            animation: "floatSphere 4s ease-in-out infinite, spherePulse 4s ease-in-out infinite",
          }}
        />
        <span className="text-[10px] font-bold text-primary tracking-wide uppercase mt-3 animate-pulse">
          AI Agent Online
        </span>
      </div>

      {/* Messages Feed */}
      <div 
        ref={scrollRef}
        className="flex flex-col gap-2.5 h-[140px] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-muted"
      >
        {messages.map((m, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col max-w-[85%] rounded-2xl p-2.5 text-xs ${
              m.sender === "user" 
                ? "self-end bg-primary text-primary-foreground rounded-tr-none" 
                : "self-start bg-muted text-foreground rounded-tl-none border border-border"
            }`}
          >
            {m.text}
          </div>
        ))}
        {isTyping && (
          <div className="self-start bg-muted text-muted-foreground rounded-2xl rounded-tl-none border border-border p-2.5 text-xs flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <div className="elevation-input flex items-center gap-2 rounded-xl px-2.5 py-1.5">
        <Mic className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask me anything..."
          className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder-muted-foreground focus:ring-0 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}
