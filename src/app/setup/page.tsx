"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleRegister() {
    setError("");
    setLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.error || "Failed to get registration options");
      }

      const options = await optionsRes.json();
      const credential = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Passkey Registered!</h1>
        <p className="text-gray-500">Redirecting to home...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-8">First-Time Setup</h1>
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="Enter setup secret"
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 w-full max-w-xs text-center"
      />
      <button
        onClick={handleRegister}
        disabled={loading || !secret}
        className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold disabled:opacity-50"
      >
        {loading ? "Registering..." : "Register Passkey"}
      </button>
      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
    </div>
  );
}
