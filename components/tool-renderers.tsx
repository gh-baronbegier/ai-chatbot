"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ChatMessage, ChatTools } from "@/lib/types";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
} from "./elements/tool";
import { Weather } from "./weather";

type ToolPart = ToolUIPart<ChatTools> | DynamicToolUIPart;

type ToolRendererProps = {
  part: ToolPart;
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  isReadonly: boolean;
};

function WeatherToolRenderer({
  part,
  addToolApprovalResponse,
}: ToolRendererProps) {
  const { toolCallId, state } = part;
  const approvalId = "approval" in part ? part.approval?.id : undefined;
  const isDenied =
    state === "output-denied" ||
    (state === "approval-responded" &&
      "approval" in part &&
      part.approval?.approved === false);
  const widthClass = "w-[min(100%,450px)]";

  if (state === "output-available") {
    return (
      <div className={widthClass} key={toolCallId}>
        <Weather weatherAtLocation={part.output} />
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className={widthClass} key={toolCallId}>
        <Tool className="w-full" defaultOpen={true}>
          <ToolHeader state="output-denied" type="tool-getWeather" />
          <ToolContent>
            <div className="px-4 py-3 text-muted-foreground text-base leading-[1.625rem] tracking-[-0.025rem]">
              Weather lookup was denied.
            </div>
          </ToolContent>
        </Tool>
      </div>
    );
  }

  if (state === "approval-responded") {
    return (
      <div className={widthClass} key={toolCallId}>
        <Tool className="w-full" defaultOpen={true}>
          <ToolHeader state={state} type="tool-getWeather" />
          <ToolContent>
            <ToolInput input={part.input} />
          </ToolContent>
        </Tool>
      </div>
    );
  }

  return (
    <div className={widthClass} key={toolCallId}>
      <Tool className="w-full" defaultOpen={true}>
        <ToolHeader state={state} type="tool-getWeather" />
        <ToolContent>
          {(state === "input-available" || state === "approval-requested") && (
            <ToolInput input={part.input} />
          )}
          {state === "approval-requested" && approvalId && (
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                className="rounded-md px-3 py-1.5 text-muted-foreground text-sm hover:bg-muted hover:text-foreground"
                onClick={() => {
                  addToolApprovalResponse({
                    id: approvalId,
                    approved: false,
                    reason: "User denied weather lookup",
                  });
                }}
                type="button"
              >
                Deny
              </button>
              <button
                className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm hover:bg-primary/90"
                onClick={() => {
                  addToolApprovalResponse({
                    id: approvalId,
                    approved: true,
                  });
                }}
                type="button"
              >
                Allow
              </button>
            </div>
          )}
        </ToolContent>
      </Tool>
    </div>
  );
}

function DynamicToolRenderer({ part }: ToolRendererProps) {
  if (part.type !== "dynamic-tool") return null;
  const { toolCallId, toolName, state } = part;
  if (state === "output-available") return null;
  return (
    <Tool defaultOpen={true} key={toolCallId}>
      <ToolHeader state={state} type={`tool-${toolName}` as `tool-${string}`} />
      <ToolContent>
        <ToolInput input={part.input} />
      </ToolContent>
    </Tool>
  );
}

function GenericToolRenderer({ part }: ToolRendererProps) {
  const { toolCallId, state, type } = part;
  if (state === "output-available") return null;
  return (
    <Tool defaultOpen={true} key={toolCallId}>
      <ToolHeader state={state} type={type as `tool-${string}`} />
      <ToolContent>
        <ToolInput input={part.input} />
      </ToolContent>
    </Tool>
  );
}

const toolRendererRegistry: Record<
  string,
  (props: ToolRendererProps) => React.ReactNode
> = {
  "tool-getWeather": WeatherToolRenderer,
  "dynamic-tool": DynamicToolRenderer,
};

export function renderToolPart(
  type: string,
  props: ToolRendererProps,
): React.ReactNode {
  const Renderer = toolRendererRegistry[type];
  if (Renderer) {
    return <Renderer {...props} />;
  }
  if (type.startsWith("tool-")) {
    return <GenericToolRenderer {...props} />;
  }
  return null;
}
