import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth, db } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const SESSION_COOKIE = "__session";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    const { joinCode } = await req.json();

    if (!joinCode || typeof joinCode !== "string" || !joinCode.trim()) {
      return NextResponse.json({ error: "Join code is required" }, { status: 400 });
    }

    const code = joinCode.trim().toUpperCase();

    // Find company by join code
    const snap = await db.collection("companies").where("joinCode", "==", code).limit(1).get();

    if (snap.empty) {
      return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
    }

    const companyDoc = snap.docs[0];
    const company = companyDoc.data();
    const now = Timestamp.now();

    // Create/update user doc — joiners do NOT get web access by default
    await db.collection("users").doc(decoded.uid).set({
      uid: decoded.uid,
      email: decoded.email || "",
      companyId: companyDoc.id,
      companyName: company.name,
      role: "user",
      webAccess: false,
      createdAt: now,
    }, { merge: true });

    return NextResponse.json({
      success: true,
      companyId: companyDoc.id,
      companyName: company.name,
    });
  } catch (error) {
    console.error("Join error:", error);
    return NextResponse.json({ error: "Failed to join company" }, { status: 500 });
  }
}
