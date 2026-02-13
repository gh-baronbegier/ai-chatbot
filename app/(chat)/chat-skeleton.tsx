export function ChatSkeleton() {
  return (
    <div className="overscroll-behavior-contain flex h-dvh w-full min-w-0 touch-pan-y flex-col bg-background">
      <div className="relative flex-1">
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto min-w-0 max-w-[768px] px-[0.375rem]">
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, transform: "translateY(36px)" }}>
                <form className="w-full overflow-hidden border rounded-none border-none bg-transparent px-0 py-0 shadow-none flex flex-col justify-center">
                  <div className="flex items-center">
                    <textarea
                      className="w-full min-h-0 h-auto grow resize-none border-0 border-none bg-transparent pl-2 pr-4 py-3 text-base leading-[1.625rem] tracking-[-0.025rem] text-right outline-none ring-0 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="ask anything"
                      rows={1}
                      disabled
                      readOnly
                    />
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
