import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "غزة بريس — أسعار شفافة · قوة المجتمع";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadArabicFont() {
  const fontUrl = "https://fonts.gstatic.com/s/tajawal/v12/Iurf6YBj_oCad4k1l5anHrRpiYlJ.woff2";
  const res = await fetch(fontUrl);
  if (!res.ok) return null;
  return await res.arrayBuffer();
}

export default async function Image() {
  const fontData = await loadArabicFont();
  const fonts = fontData
    ? [{ name: "Tajawal", data: fontData, weight: 800 as const, style: "normal" as const }]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1A1F2E 0%, #2d3748 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            padding: 48,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "white",
              fontFamily: fonts.length ? "Tajawal, sans-serif" : "sans-serif",
            }}
          >
            غزة بريس
          </div>
          <div
            style={{
              fontSize: 32,
              color: "rgba(255,255,255,0.85)",
              fontFamily: fonts.length ? "Tajawal, sans-serif" : "sans-serif",
            }}
          >
            أسعار شفافة · قوة المجتمع
          </div>
          <div
            style={{
              marginTop: 24,
              padding: "12px 32px",
              background: "#4A7C59",
              borderRadius: 999,
              fontSize: 20,
              color: "white",
              fontFamily: "sans-serif",
            }}
          >
            Gaza Price — Transparent Prices
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
