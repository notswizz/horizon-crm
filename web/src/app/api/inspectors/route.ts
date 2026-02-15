import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function PATCH(req: NextRequest) {
  try {
    const { oldName, newName } = await req.json();

    if (!oldName || !newName || typeof oldName !== "string" || typeof newName !== "string") {
      return NextResponse.json({ error: "oldName and newName are required" }, { status: 400 });
    }

    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (!trimmedOld || !trimmedNew || trimmedOld === trimmedNew) {
      return NextResponse.json({ error: "Names must be different and non-empty" }, { status: 400 });
    }

    // Collect all form refs that need updating
    const jobsSnap = await db.collection("jobs").get();
    const toUpdate: FirebaseFirestore.DocumentReference[] = [];

    for (const jobDoc of jobsSnap.docs) {
      const formsSnap = await jobDoc.ref.collection("forms").get();
      for (const formDoc of formsSnap.docs) {
        const data = formDoc.data();
        if (data.inspectorName === trimmedOld) {
          toUpdate.push(formDoc.ref);
        }
      }
    }

    // Commit in chunks of 500 (Firestore batch limit)
    for (let i = 0; i < toUpdate.length; i += 500) {
      const chunk = toUpdate.slice(i, i + 500);
      const batch = db.batch();
      for (const ref of chunk) {
        batch.update(ref, { inspectorName: trimmedNew });
      }
      await batch.commit();
    }

    // Also update the config inspectorNames list
    const configRef = db.doc("config/dropdowns");
    const configDoc = await configRef.get();
    if (configDoc.exists) {
      const cfg = configDoc.data()!;
      const names: string[] = cfg.inspectorNames || [];
      const idx = names.indexOf(trimmedOld);
      if (idx !== -1) {
        names[idx] = trimmedNew;
        await configRef.update({ inspectorNames: names });
      }
    }

    return NextResponse.json({ updated: toUpdate.length, oldName: trimmedOld, newName: trimmedNew });
  } catch (error) {
    console.error("Error renaming inspector:", error);
    return NextResponse.json({ error: "Failed to rename inspector" }, { status: 500 });
  }
}
