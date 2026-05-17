"use client";

import { useState, useCallback, useRef } from "react";

interface Message { id: string; role: "user" | "assistant"; content: string; timestamp: Date }

export function useAIChat(options: { contextType?: string; contextId?: string; onError?: (error: string) => void } = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content, timestamp: new Date() };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "", timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })), contextType: options.contextType, contextId: options.contextId }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Chat API error: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: accumulated } : m));
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      options.onError?.(err.message);
      setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: "Sorry, I encountered an error. Please try again." } : m));
    } finally { setIsStreaming(false); abortRef.current = null; }
  }, [messages, options]);

  const stopStreaming = useCallback(() => { abortRef.current?.abort(); setIsStreaming(false); }, []);
  const clearMessages = useCallback(() => { setMessages([]); }, []);

  return { messages, isStreaming, sendMessage, stopStreaming, clearMessages };
}
