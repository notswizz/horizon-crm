import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { getAuthSession } from "@/lib/auth-helpers";
import { toDate } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    // Two queries total instead of 2*N
    const [companiesSnap, jobsSnap] = await Promise.all([
      db.collection("companies").get(),
      db.collection("jobs").select("companyId", "photoCount").get(),
    ]);

    // Aggregate jobs in memory
    const jobCounts: Record<string, number> = {};
    const photoCounts: Record<string, number> = {};
    for (const doc of jobsSnap.docs) {
      const cid = doc.data().companyId || "";
      jobCounts[cid] = (jobCounts[cid] || 0) + 1;
      photoCounts[cid] = (photoCounts[cid] || 0) + (doc.data().photoCount || 0);
    }

    const companies = companiesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        email: data.email || "",
        joinCode: data.joinCode || "",
        jobCount: jobCounts[doc.id] || 0,
        photoCount: photoCounts[doc.id] || 0,
        createdAt: toDate(data.createdAt),
      };
    });

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}
