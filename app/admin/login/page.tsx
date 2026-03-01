"use client";

import { useState } from "react";
import Link from "next/link";
import { setStoredToken } from "@/lib/auth/token";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as { access_token?: string; accessToken?: string; error?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Invalid credentials");
        setLoading(false);
        return;
      }
      const token = data.access_token ?? data.accessToken;
      if (token) {
        setStoredToken(token);
        const meRes = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          window.location.href = "/admin/dashboard";
          return;
        }
      }
      setError("Login succeeded but admin check failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#4A7C59] to-[#6BA880] text-2xl">
          🌿
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[#D8E4F0]">GazaPrice Admin</h1>
          <p className="text-sm text-[#8FA3B8]">غزةبريس · Sign in</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-[#243040] bg-[#111820] p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-medium text-[#D8E4F0]">Sign in</h2>
        {error && (
          <div className="mb-4 rounded-lg border border-[#E05A4E40] bg-[#E05A4E18] px-4 py-2 text-sm text-[#E05A4E]">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#8FA3B8]">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@test.com"
              required
              className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2.5 text-[#D8E4F0] placeholder-[#4E6070] focus:border-[#4A7C59] focus:outline-none focus:ring-1 focus:ring-[#4A7C59]"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#8FA3B8]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2.5 text-[#D8E4F0] placeholder-[#4E6070] focus:border-[#4A7C59] focus:outline-none focus:ring-1 focus:ring-[#4A7C59]"
            />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm text-[#8FA3B8] hover:text-[#D8E4F0] transition-colors"
          >
            ← Back to app
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#4A7C59] px-5 py-2.5 font-medium text-white hover:bg-[#3A6347] disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
