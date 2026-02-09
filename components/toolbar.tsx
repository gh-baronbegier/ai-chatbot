"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import cx from "classnames";
import { nanoid } from "nanoid";
import {
  type Dispatch,
  memo,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { useOnClickOutside } from "usehooks-ts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatMessage } from "@/lib/types";
import { type ArtifactKind, artifactDefinitions } from "./artifact";
import type { ArtifactToolbarItem } from "./create-artifact";
import { ArrowUpIcon, StopIcon, SummarizeIcon } from "./icons";

type ToolProps = {
  description: string;
  icon: ReactNode;
  selectedTool: string | null;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  isToolbarVisible?: boolean;
  setIsToolbarVisible?: Dispatch<SetStateAction<boolean>>;
  isAnimating: boolean;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  onClick: ({
    sendMessage,
  }: {
    sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  }) => void;
};

const Tool = ({
  description,
  icon,
  selectedTool,
  setSelectedTool,
  isToolbarVisible,
  setIsToolbarVisible,
  isAnimating,
  sendMessage,
  onClick,
}: ToolProps) => {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (selectedTool !== description) {
      setIsHovered(false);
    }
  }, [selectedTool, description]);

  const handleSelect = () => {
    if (!isToolbarVisible && setIsToolbarVisible) {
      setIsToolbarVisible(true);
      return;
    }

    if (!selectedTool) {
      setIsHovered(true);
      setSelectedTool(description);
      return;
    }

    if (selectedTool !== description) {
      setSelectedTool(description);
    } else {
      setSelectedTool(null);
      onClick({ sendMessage });
    }
  };

  return (
    <Tooltip open={isHovered && !isAnimating}>
      <TooltipTrigger asChild>
        <div
          className={cx("rounded-full p-3", {
            "bg-primary text-primary-foreground!": selectedTool === description,
          })}
          onClick={() => {
            handleSelect();
          }}
          onMouseEnter={() => {
            setIsHovered(true);
          }}
          onMouseLeave={() => {
            if (selectedTool !== description) {
              setIsHovered(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSelect();
            }
          }}
        >
          {selectedTool === description ? <ArrowUpIcon /> : icon}
        </div>
      </TooltipTrigger>
      <TooltipContent
        className="rounded-2xl bg-foreground p-3 px-4 text-background"
        side="left"
        sideOffset={16}
      >
        {description}
      </TooltipContent>
    </Tooltip>
  );
};

const randomArr = [...new Array(6)].map((_x) => nanoid(5));

const ReadingLevelSelector = ({
  setSelectedTool,
  sendMessage,
  isAnimating,
}: {
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  isAnimating: boolean;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
}) => {
  const LEVELS = [
    "Elementary",
    "Middle School",
    "Keep current level",
    "High School",
    "College",
    "Graduate",
  ];

  const [currentLevel, setCurrentLevel] = useState(2);
  const [hasUserSelectedLevel, setHasUserSelectedLevel] =
    useState<boolean>(false);

  return (
    <div className="relative flex flex-col items-center justify-end">
      {randomArr.map((id) => (
        <div
          className="flex size-[40px] flex-row items-center justify-center"
          key={id}
        >
          <div className="size-2 rounded-full bg-muted-foreground/40" />
        </div>
      ))}

      <TooltipProvider>
        <Tooltip open={!isAnimating}>
          <TooltipTrigger asChild>
            <div
              className={cx(
                "absolute flex flex-row items-center rounded-full border bg-background p-3",
                {
                  "bg-primary text-primary-foreground": currentLevel !== 2,
                  "bg-background text-foreground": currentLevel === 2,
                }
              )}
              onClick={() => {
                if (currentLevel !== 2 && hasUserSelectedLevel) {
                  sendMessage({
                    role: "user",
                    parts: [
                      {
                        type: "text",
                        text: `Please adjust the reading level to ${LEVELS[currentLevel]} level.`,
                      },
                    ],
                  });

                  setSelectedTool(null);
                }
              }}
            >
              {currentLevel === 2 ? <SummarizeIcon /> : <ArrowUpIcon />}
            </div>
          </TooltipTrigger>
          <TooltipContent
            className="rounded-2xl bg-foreground p-3 px-4 text-background text-sm"
            side="left"
            sideOffset={16}
          >
            {LEVELS[currentLevel]}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export const Tools = ({
  isToolbarVisible,
  selectedTool,
  setSelectedTool,
  sendMessage,
  isAnimating,
  setIsToolbarVisible,
  tools,
}: {
  isToolbarVisible: boolean;
  selectedTool: string | null;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  isAnimating: boolean;
  setIsToolbarVisible: Dispatch<SetStateAction<boolean>>;
  tools: ArtifactToolbarItem[];
}) => {
  const [primaryTool, ...secondaryTools] = tools;

  return (
    <div className="flex flex-col gap-1.5">
      {isToolbarVisible &&
        secondaryTools.map((secondaryTool) => (
          <Tool
            description={secondaryTool.description}
            icon={secondaryTool.icon}
            isAnimating={isAnimating}
            key={secondaryTool.description}
            onClick={secondaryTool.onClick}
            selectedTool={selectedTool}
            sendMessage={sendMessage}
            setSelectedTool={setSelectedTool}
          />
        ))}

      <Tool
        description={primaryTool.description}
        icon={primaryTool.icon}
        isAnimating={isAnimating}
        isToolbarVisible={isToolbarVisible}
        onClick={primaryTool.onClick}
        selectedTool={selectedTool}
        sendMessage={sendMessage}
        setIsToolbarVisible={setIsToolbarVisible}
        setSelectedTool={setSelectedTool}
      />
    </div>
  );
};

const PureToolbar = ({
  isToolbarVisible,
  setIsToolbarVisible,
  sendMessage,
  status,
  stop,
  setMessages,
  artifactKind,
}: {
  isToolbarVisible: boolean;
  setIsToolbarVisible: Dispatch<SetStateAction<boolean>>;
  status: UseChatHelpers<ChatMessage>["status"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  artifactKind: ArtifactKind;
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useOnClickOutside(toolbarRef, () => {
    setIsToolbarVisible(false);
    setSelectedTool(null);
  });

  const startCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSelectedTool(null);
      setIsToolbarVisible(false);
    }, 2000);
  };

  const cancelCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status === "streaming") {
      setIsToolbarVisible(false);
    }
  }, [status, setIsToolbarVisible]);

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifactKind
  );

  if (!artifactDefinition) {
    throw new Error("Artifact definition not found!");
  }

  const toolsByArtifactKind = artifactDefinition.toolbar;

  if (toolsByArtifactKind.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className="absolute right-6 bottom-6 flex cursor-pointer flex-col justify-end rounded-full border bg-background p-1.5 shadow-lg"
        onMouseLeave={() => {
          if (status === "streaming") {
            return;
          }

          startCloseTimer();
        }}
        onMouseEnter={() => {
          if (status === "streaming") {
            return;
          }

          cancelCloseTimer();
          setIsToolbarVisible(true);
        }}
        ref={toolbarRef}
      >
        {status === "streaming" ? (
          <div
            className="p-3"
            key="stop-icon"
            onClick={() => {
              stop();
              setMessages((messages) => messages);
            }}
          >
            <StopIcon />
          </div>
        ) : selectedTool === "adjust-reading-level" ? (
          <ReadingLevelSelector
            isAnimating={isAnimating}
            key="reading-level-selector"
            sendMessage={sendMessage}
            setSelectedTool={setSelectedTool}
          />
        ) : (
          <Tools
            isAnimating={isAnimating}
            isToolbarVisible={isToolbarVisible}
            key="tools"
            selectedTool={selectedTool}
            sendMessage={sendMessage}
            setIsToolbarVisible={setIsToolbarVisible}
            setSelectedTool={setSelectedTool}
            tools={toolsByArtifactKind}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export const Toolbar = memo(PureToolbar, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.isToolbarVisible !== nextProps.isToolbarVisible) {
    return false;
  }
  if (prevProps.artifactKind !== nextProps.artifactKind) {
    return false;
  }

  return true;
});
