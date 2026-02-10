"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useState,
} from "react";


type ModelContextValue = {
  thinkingBudget: number;
  setThinkingBudget: (v: number) => void;
  maxTokens: number;
  setMaxTokens: (v: number) => void;
};

const ModelContext = createContext<ModelContextValue | undefined>(undefined);

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

export function ModelProvider({
  initialThinkingBudget,
  initialMaxTokens,
  children,
}: {
  initialThinkingBudget: number;
  initialMaxTokens: number;
  children: ReactNode;
}) {
  const [thinkingBudget, _setThinkingBudget] = useState(initialThinkingBudget);
  const [maxTokens, _setMaxTokens] = useState(initialMaxTokens);

  const setThinkingBudget = (v: number) => {
    _setThinkingBudget(v);
    setCookie("chat-thinking-budget", String(v));
  };

  const setMaxTokens = (v: number) => {
    _setMaxTokens(v);
    setCookie("chat-max-tokens", String(v));
  };

  return (
    <ModelContext.Provider
      value={{
        thinkingBudget,
        setThinkingBudget,
        maxTokens,
        setMaxTokens,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
}
