"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/firebase-client";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        throw new Error("Failed to create session");
      }

      const { needsOnboarding } = await res.json();
      router.push(needsOnboarding ? "/onboarding" : "/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password") || message.includes("auth/user-not-found")) {
        setError("Invalid email or password");
      } else if (message.includes("auth/email-already-in-use")) {
        setError("An account with this email already exists");
      } else if (message.includes("auth/weak-password")) {
        setError("Password must be at least 6 characters");
      } else {
        setError(message);
      }
      setLoading(false);
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-80">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
          <div className="flex flex-col items-center gap-2">
            <Image src="/logo.png" alt="RetrofitIQ" width={48} height={48} className="rounded-xl" />
            <h1 className="text-lg font-bold text-gray-800">RetrofitIQ</h1>
            <p className="text-xs text-gray-400">{isSignUp ? "Create an account" : "Sign in to continue"}</p>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="Email"
            autoFocus
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none transition-colors focus:border-[#FF6B35]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Password"
            className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors ${
              error ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-[#FF6B35]"
            }`}
          />
          {error && <p className="text-xs text-red-500 -mt-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#E5532D] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Sign Up" : "Sign In")}
          </button>
          <p className="text-xs text-center text-gray-400">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="text-[#FF6B35] font-semibold hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
