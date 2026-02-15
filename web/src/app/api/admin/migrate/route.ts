import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { getAuthSession } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { companyId } = await req.json();
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    // Find all jobs without a companyId field
    const snap = await db.collection("jobs").get();
    const toUpdate = snap.docs.filter((doc) => !doc.data().companyId);

    // Batch update in chunks of 500
    let updated = 0;
    for (let i = 0; i < toUpdate.length; i += 500) {
      const chunk = toUpdate.slice(i, i + 500);
      const batch = db.batch();
      for (const doc of chunk) {
        batch.update(doc.ref, { companyId });
      }
      await batch.commit();
      updated += chunk.length;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
