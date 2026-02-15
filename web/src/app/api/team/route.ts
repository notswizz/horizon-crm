import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/firebase-admin";

// GET: list all users in the same company
export async function GET() {
  const session = await getAuthSession();
  if (!session || !session.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only users with web access can manage team
  if (!session.isAdmin && !session.webAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snap = await db
    .collection("users")
    .where("companyId", "==", session.companyId)
    .get();

  const members = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      uid: doc.id,
      email: d.email || "",
      displayName: d.displayName || "",
      webAccess: d.webAccess === true,
      isSelf: doc.id === session.uid,
    };
  });

  return NextResponse.json({ members });
}

// PATCH: toggle webAccess for a team member
export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !session.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.isAdmin && !session.webAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { uid, webAccess } = await req.json();
  if (!uid || typeof webAccess !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify target user belongs to same company
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.companyId !== session.companyId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await db.collection("users").doc(uid).update({ webAccess });

  return NextResponse.json({ success: true });
}
