"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useState,
} from "react";

import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";

type ModelContextValue = {
  thinkingBudget: number;
  setThinkingBudget: (v: number) => void;
  maxTokens: number;
  setMaxTokens: (v: number) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
};

const ModelContext = createContext<ModelContextValue | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [thinkingBudget, _setThinkingBudget] = useState(128_000);
  const [maxTokens, _setMaxTokens] = useState(128_000);
  const [selectedModel, _setSelectedModel] = useState(DEFAULT_CHAT_MODEL);

  const setThinkingBudget = (v: number) => {
    _setThinkingBudget(v);
  };

  const setMaxTokens = (v: number) => {
    _setMaxTokens(v);
  };

  const setSelectedModel = (v: string) => {
    _setSelectedModel(v);
  };

  return (
    <ModelContext.Provider
      value={{
        thinkingBudget,
        setThinkingBudget,
        maxTokens,
        setMaxTokens,
        selectedModel,
        setSelectedModel,
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
