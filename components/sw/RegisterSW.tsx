"use client";

import { useEffect, useRef, useState } from "react";
import { OfflineBanner } from "./OfflineBanner";

export function RegisterSW() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingWorker = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates periodically (every 60 min)
        const interval = setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available
              waitingWorker.current = newWorker;
              setUpdateAvailable(true);
            }
          });
        });

        return () => clearInterval(interval);
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
  }, []);

  function applyUpdate() {
    waitingWorker.current?.postMessage({ type: "SKIP_WAITING" });
    setUpdateAvailable(false);
    window.location.reload();
  }

  return (
    <>
      <OfflineBanner />

      {updateAvailable && (
        <div
          role="alert"
          onClick={applyUpdate}
          style={{
            position: "fixed",
            bottom: 90,
            left: 16,
            right: 16,
            zIndex: 9998,
            background: "#1A1F2E",
            borderRadius: "14px",
            overflow: "hidden",
            cursor: "pointer",
            direction: "rtl",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              gap: "12px",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUpdateAvailable(false);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#888",
                fontSize: "16px",
                cursor: "pointer",
                padding: "0 4px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>
                تحديث جديد متاح
              </div>
              <div style={{ color: "#9CA3AF", fontSize: "12px", marginTop: "2px" }}>
                اضغط هنا لتحديث الأسعار
              </div>
            </div>
            <span style={{ fontSize: "24px" }}>📦</span>
          </div>
          <div style={{ height: "3px", background: "#2A2F3E" }}>
            <div
              style={{
                height: "100%",
                width: "100%",
                background: "#4A7C59",
                animation: "sw-progress 5s linear forwards",
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes sw-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </>
  );
}
