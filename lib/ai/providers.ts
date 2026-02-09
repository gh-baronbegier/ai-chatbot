import { gateway } from "@ai-sdk/gateway";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const THINKING_SUFFIX_REGEX = /-thinking$/;

const venice = createOpenAI({
  apiKey: process.env.VENICE_API_KEY,
  baseURL: "https://api.venice.ai/api/v1",
});

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const anthropicDirect = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openaiDirect = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const xaiDirect = createXai({
  apiKey: process.env.XAI_API_KEY,
});

const googleDirect = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  // Route Venice models to the Venice provider (use .chat() for /chat/completions compatibility)
  if (modelId.startsWith("venice/")) {
    const veniceModelId = modelId.replace("venice/", "");
    return venice.chat(veniceModelId);
  }

  // Route Groq models to the Groq provider
  if (modelId.startsWith("groq/")) {
    const groqModelId = modelId.slice(5); // strip "groq/" prefix
    return groq.languageModel(groqModelId);
  }

  // Route direct Anthropic models (strip -think-low/medium/high suffix)
  if (modelId.startsWith("anthropic-direct/")) {
    const anthropicModelId = modelId
      .slice("anthropic-direct/".length)
      .replace(/-think-(low|medium|high)$/, "");
    return anthropicDirect.languageModel(anthropicModelId);
  }

  // Route direct OpenAI models
  if (modelId.startsWith("openai-direct/")) {
    const openaiModelId = modelId.slice("openai-direct/".length);
    return openaiDirect.languageModel(openaiModelId);
  }

  // Route direct xAI models
  if (modelId.startsWith("xai-direct/")) {
    const xaiModelId = modelId.slice("xai-direct/".length);
    return xaiDirect.languageModel(xaiModelId);
  }

  // Route direct Google models
  if (modelId.startsWith("google-direct/")) {
    const googleModelId = modelId.slice("google-direct/".length);
    return googleDirect.languageModel(googleModelId);
  }

  const isReasoningModel =
    modelId.includes("reasoning") || modelId.endsWith("-thinking");

  if (isReasoningModel) {
    const gatewayModelId = modelId.replace(THINKING_SUFFIX_REGEX, "");

    return wrapLanguageModel({
      model: gateway.languageModel(gatewayModelId),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return gateway.languageModel("google/gemini-2.5-flash-lite");
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return gateway.languageModel("anthropic/claude-haiku-4.5");
}
