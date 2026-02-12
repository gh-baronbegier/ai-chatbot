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

export function ModelProvider({ children }: { children: ReactNode }) {
  const [thinkingBudget, _setThinkingBudget] = useState(128_000);
  const [maxTokens, _setMaxTokens] = useState(128_000);

  const setThinkingBudget = (v: number) => {
    _setThinkingBudget(v);
  };

  const setMaxTokens = (v: number) => {
    _setMaxTokens(v);
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
