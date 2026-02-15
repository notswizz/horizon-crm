import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/firebase-admin";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch join code from company doc
  let joinCode = "";
  if (session.companyId) {
    const companyDoc = await db.collection("companies").doc(session.companyId).get();
    if (companyDoc.exists) {
      joinCode = companyDoc.data()?.joinCode || "";
    }
  }

  return NextResponse.json({ ...session, joinCode });
}
