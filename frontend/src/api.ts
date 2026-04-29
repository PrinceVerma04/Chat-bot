export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatResponse = {
  conversation_id: string;
  answer: string;
};

export async function sendChat(params: {
  message: string;
  conversationId?: string;
  history?: ChatMessage[];
}): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: params.message,
      conversation_id: params.conversationId,
      history: params.history ?? []
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as ChatResponse;
}

