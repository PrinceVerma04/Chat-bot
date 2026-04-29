import React, { useMemo, useState } from "react";
import { ChatMessage, sendChat } from "./api";

type UiMsg = ChatMessage & { id: string };

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function App() {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<UiMsg[]>([
    {
      id: uid(),
      role: "assistant",
      content:
        "Hi! Ask me about recent papers (Arxiv), concepts (Wikipedia), or anything that benefits from web search (Tavily)."
    }
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiHistory = useMemo(
    () => messages.map(({ role, content }) => ({ role, content })),
    [messages]
  );

  async function onSend() {
    const text = input.trim();
    if (!text || isSending) return;

    setError(null);
    setIsSending(true);
    setInput("");

    const userMsg: UiMsg = { id: uid(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await sendChat({
        message: text,
        conversationId,
        history: apiHistory
      });
      setConversationId(res.conversation_id);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: res.answer || "(No response)" }
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsSending(false);
    }
  }

  function onReset() {
    setConversationId(undefined);
    setMessages([
      {
        id: uid(),
        role: "assistant",
        content:
          "New chat started. Ask me anything — I can call tools (Arxiv/Wikipedia/Tavily) when helpful."
      }
    ]);
    setError(null);
    setInput("");
  }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">CB</div>
          <div>
            <div className="brandTitle">Chat Bot</div>
            <div className="brandSub">LangGraph + Groq tools</div>
          </div>
        </div>

        <div className="card">
          <div className="cardTitle">Backend</div>
          <div className="kv">
            <span className="k">API</span>
            <span className="v">/api/chat</span>
          </div>
          <div className="kv">
            <span className="k">Conversation</span>
            <span className="v mono">{conversationId ?? "—"}</span>
          </div>
          <button className="btn" onClick={onReset} disabled={isSending}>
            New chat
          </button>
        </div>

        <div className="card">
          <div className="cardTitle">Tools</div>
          <ul className="list">
            <li>Arxiv</li>
            <li>Wikipedia</li>
            <li>Tavily Search</li>
          </ul>
        </div>

        <div className="footer">
          <div className="muted">
            Tip: ask “recent NeurIPS papers on deepfake audio detection”.
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbarTitle">Chat</div>
          <div className="topbarRight">
            {isSending ? <span className="pill">Thinking…</span> : null}
          </div>
        </header>

        <section className="chat">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`msgRow ${m.role === "user" ? "right" : "left"}`}
            >
              <div className={`msgBubble ${m.role}`}>
                <div className="msgRole">
                  {m.role === "user" ? "You" : "Assistant"}
                </div>
                <div className="msgContent">{m.content}</div>
              </div>
            </div>
          ))}
        </section>

        <footer className="composer">
          {error ? <div className="error">{error}</div> : null}
          <div className="composerRow">
            <textarea
              className="input"
              placeholder="Type your message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onSend();
              }}
              rows={2}
              disabled={isSending}
            />
            <button className="btnPrimary" onClick={onSend} disabled={isSending}>
              Send
            </button>
          </div>
          <div className="hint">Send: click button • Ctrl/⌘ + Enter</div>
        </footer>
      </main>
    </div>
  );
}

