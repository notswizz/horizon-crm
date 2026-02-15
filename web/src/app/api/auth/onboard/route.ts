import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth, db } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { randomUUID, randomBytes } from "crypto";

const ADMIN_EMAIL = "swizz@gmail.com";
const SESSION_COOKIE = "__session";

function generateJoinCode(): string {
  return randomBytes(3).toString("hex").toUpperCase(); // 6-char hex code
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    const { companyName } = await req.json();

    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const trimmedName = companyName.trim();
    const isAdmin = decoded.email === ADMIN_EMAIL;
    const companyId = randomUUID();
    const joinCode = generateJoinCode();
    const now = Timestamp.now();

    // Create company doc with join code
    await db.collection("companies").doc(companyId).set({
      id: companyId,
      name: trimmedName,
      email: decoded.email || "",
      joinCode,
      createdAt: now,
    });

    // Create user doc — company creator gets web access
    await db.collection("users").doc(decoded.uid).set({
      uid: decoded.uid,
      email: decoded.email || "",
      companyId,
      companyName: trimmedName,
      role: isAdmin ? "admin" : "user",
      webAccess: true,
      createdAt: now,
    });

    return NextResponse.json({ success: true, companyId, joinCode });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Onboarding failed" }, { status: 500 });
  }
}
