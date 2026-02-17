import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

const SESSION_COOKIE = "__session";
const EXPIRES_IN = 60 * 60 * 24 * 14 * 1000; // 14 days

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the ID token
    const decoded = await auth.verifyIdToken(idToken);

    // Create session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: EXPIRES_IN });

    // Check if user doc exists with a companyId (needs onboarding?)
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    const needsOnboarding = !userDoc.exists || !userDoc.data()?.companyId;

    // Set httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      maxAge: EXPIRES_IN / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ needsOnboarding });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, "", {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });
    // Also clear impersonation cookie
    cookieStore.set("impersonate_company", "", {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session deletion error:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
