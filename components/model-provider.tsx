"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { DEFAULT_CHAT_MODEL, MODELS } from "@/lib/ai/models";
import { getAvailableModelIds } from "@/app/(chat)/actions";

type ModelContextValue = {
  thinkingBudget: number;
  setThinkingBudget: (v: number) => void;
  maxTokens: number;
  setMaxTokens: (v: number) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  availableModelIds: string[];
};

const ALL_MODEL_IDS = MODELS.map((m) => m.id);
const ModelContext = createContext<ModelContextValue | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [thinkingBudget, _setThinkingBudget] = useState(128_000);
  const [maxTokens, _setMaxTokens] = useState(128_000);
  const [availableModelIds, setAvailableModelIds] = useState<string[]>(ALL_MODEL_IDS);
  const [selectedModel, _setSelectedModel] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedModel") ?? DEFAULT_CHAT_MODEL;
    }
    return DEFAULT_CHAT_MODEL;
  });

  useEffect(() => {
    getAvailableModelIds().then(setAvailableModelIds);
  }, []);

  const setThinkingBudget = useCallback((v: number) => {
    _setThinkingBudget(v);
  }, []);

  const setMaxTokens = useCallback((v: number) => {
    _setMaxTokens(v);
  }, []);

  const setSelectedModel = useCallback((v: string) => {
    _setSelectedModel(v);
    localStorage.setItem("selectedModel", v);
  }, []);

  const value = useMemo(
    () => ({
      thinkingBudget,
      setThinkingBudget,
      maxTokens,
      setMaxTokens,
      selectedModel,
      setSelectedModel,
      availableModelIds,
    }),
    [thinkingBudget, setThinkingBudget, maxTokens, setMaxTokens, selectedModel, setSelectedModel, availableModelIds],
  );

  return (
    <ModelContext.Provider value={value}>
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
