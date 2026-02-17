import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { getAuthSession } from "@/lib/auth-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { id } = await params;
    const { uid, action, webAccess } = await req.json();

    if (!uid || typeof uid !== "string") {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    if (!action || !["toggleAccess", "remove"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Verify the user belongs to this company
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data()!;
    if (userData.companyId !== id) {
      return NextResponse.json({ error: "User does not belong to this company" }, { status: 403 });
    }

    if (action === "toggleAccess") {
      await db.collection("users").doc(uid).update({ webAccess: !!webAccess });
    } else if (action === "remove") {
      await db.collection("users").doc(uid).delete();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}
