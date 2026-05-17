"use client";

import { create } from "zustand";

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolCalls?: { name: string; result: string }[];
}

interface AIState {
  messages: AIMessage[];
  isStreaming: boolean;
  contextType: "global" | "deal" | "company" | "contact" | "advisory";
  contextId: string | null;
  addMessage: (message: AIMessage) => void;
  updateLastMessage: (content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setContext: (type: AIState["contextType"], id: string | null) => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  messages: [],
  isStreaming: false,
  contextType: "global",
  contextId: null,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        };
      }
      return { messages };
    }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setContext: (contextType, contextId) => set({ contextType, contextId }),
  clearMessages: () => set({ messages: [] }),
}));
