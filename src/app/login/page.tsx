"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/login-options", { method: "POST" });
      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.error || "Failed to get login options");
      }
      const options = await optionsRes.json();

      const credential = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Login failed");
      }

      // Force full page reload to ensure middleware picks up new session cookie
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-8">Project Manager</h1>
      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in with Passkey"}
      </button>
      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
    </div>
  );
}
