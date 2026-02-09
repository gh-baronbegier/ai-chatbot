import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ catchall: string[] }> }
) {
  const { catchall } = await params;
  const path = catchall.join("/");
  return Response.redirect(
    `https://baronbegier.com/?d=a.baronbegier.com&p=${encodeURIComponent(path)}`
  );
}
