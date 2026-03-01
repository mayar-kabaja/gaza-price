"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type AdminToastContextType = {
  toast: (message: string, type?: ToastType) => void;
};

const AdminToastContext = createContext<AdminToastContextType | null>(null);

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);
  return (
    <AdminToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${
              t.type === "success"
                ? "bg-[#4A7C59] text-white"
                : t.type === "error"
                ? "bg-[#E05A4E] text-white"
                : "bg-[#18212C] text-[#D8E4F0] border border-[#243040]"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </AdminToastContext.Provider>
  );
}

export function useAdminToast() {
  const ctx = useContext(AdminToastContext);
  return ctx ?? { toast: () => {} };
}
