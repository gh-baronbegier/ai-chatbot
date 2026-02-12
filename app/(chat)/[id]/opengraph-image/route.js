import { ImageResponse } from "next/og";
import { sfProBoldBase64, sfProRegularBase64 } from "../../opengraph-image/fonts/sf-pro.js";
import { getChatById } from "@/lib/db/queries";

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

const sfProBold = base64ToArrayBuffer(sfProBoldBase64);
const sfProRegular = base64ToArrayBuffer(sfProRegularBase64);

const GRID_URL = "https://imagedelivery.net/TgyYfXLmYx-JJG3tKWEdbw/og-home-grid/og";

function truncate(str, maxLength = 28) {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength);
}

export async function GET(_request, { params }) {
  const { id } = await params;

  let title = "Baron Begier - Agent";
  try {
    const chat = await getChatById({ id });
    if (chat?.title) {
      title = truncate(chat.title);
    }
  } catch {
    // fallback to default title
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          position: "relative",
          backgroundColor: "#292929",
        }}
      >
        <img
          src={GRID_URL}
          alt=""
          width={1200}
          height={630}
          style={{
            width: 1200,
            height: 630,
            objectFit: "cover",
            position: "absolute",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
        <div
          style={{
            background: "#000",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "0 6px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontFamily: "SF Pro",
          }}
        >
          <div style={{ color: "white", fontSize: 72, fontWeight: 700 }}>
            {title}
          </div>
        </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "SF Pro",
          data: sfProBold,
          weight: 700,
          style: "normal",
        },
        {
          name: "SF Pro",
          data: sfProRegular,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );
}
