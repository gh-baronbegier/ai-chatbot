import type { UIMessage } from "ai";
import { z } from "zod";
import type { getWeather } from "./ai/tools/get-weather";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type ChatTools = {
  getWeather: typeof getWeather;
};

export type CustomUIDataTypes = {
  appendMessage: string;
  "chat-title": string;
  "chat-model": {
    requested: string;
    resolved: string;
  };
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
