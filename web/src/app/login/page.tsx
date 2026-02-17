"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/firebase-client";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
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

      // Load profile into auth context, then navigate
      await refreshUser();
      router.push("/");
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
    <div className="h-screen relative overflow-hidden flex items-center justify-center bg-[#0a1628]">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d2137] via-[#0a1628] to-[#071020]" />

      {/* Floating ambient orbs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#4CAF50]/15 blur-[120px]"
        style={{ animation: "drift 8s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#1a3a5c]/40 blur-[120px]"
        style={{ animation: "drift 8s ease-in-out infinite reverse" }}
      />
      <div
        className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-[#FF6B35]/10 blur-[100px]"
        style={{ animation: "drift 12s ease-in-out infinite 2s" }}
      />

      {/* Glass card */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-96"
        style={{ animation: "fadeSlideUp 0.6s ease-out" }}
      >
        <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/[0.10] shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-8 space-y-5">
          {/* Branding */}
          <div className="flex flex-col items-center gap-2">
            <Image src="/logo.png" alt="RetrofitIQ" width={52} height={52} className="rounded-xl" />
            <h1 className="text-xl font-bold text-white">Retrofit<span className="ml-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#FF6B35] to-[#4CAF50] text-white text-lg">IQ</span></h1>
            <p className="text-sm text-white/50">
              {isSignUp ? "Create an account" : "Sign in to continue"}
            </p>
          </div>

          {/* Email input */}
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="Email"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm text-white placeholder:text-white/40 outline-none transition-all duration-200 focus:border-[#FF6B35]/70 focus:ring-1 focus:ring-[#FF6B35]/30 focus:bg-white/[0.08]"
          />

          {/* Password input */}
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Password"
            className={`w-full px-4 py-3 rounded-xl bg-white/[0.06] border text-sm text-white placeholder:text-white/40 outline-none transition-all duration-200 ${
              error
                ? "border-red-400/60 bg-red-500/[0.08]"
                : "border-white/[0.1] focus:border-[#FF6B35]/70 focus:ring-1 focus:ring-[#FF6B35]/30 focus:bg-white/[0.08]"
            }`}
          />

          {/* Error message */}
          {error && (
            <p className="text-xs text-red-300 bg-red-500/[0.12] border border-red-400/20 rounded-lg px-3 py-2 -mt-2">
              {error}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#E5532D] text-white text-sm font-semibold transition-all duration-200 hover:shadow-[0_4px_20px_rgba(255,107,53,0.4)] hover:brightness-110 disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Sign Up" : "Sign In")}
          </button>

          {/* Toggle sign in / sign up */}
          <p className="text-sm text-center text-white/40">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="text-[#FF6B35] font-semibold hover:text-[#ff8a5c] transition-colors"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </form>

    </div>
  );
}
