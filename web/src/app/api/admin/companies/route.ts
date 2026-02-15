import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { getAuthSession } from "@/lib/auth-helpers";
import { toDate } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const companiesSnap = await db.collection("companies").get();
    const companies = await Promise.all(
      companiesSnap.docs.map(async (doc) => {
        const data = doc.data();
        // Count jobs for this company
        const jobsSnap = await db.collection("jobs").where("companyId", "==", doc.id).count().get();
        const jobCount = jobsSnap.data().count;

        // Count photos across jobs
        const jobsForPhotos = await db.collection("jobs").where("companyId", "==", doc.id).select("photoCount").get();
        const photoCount = jobsForPhotos.docs.reduce((sum, j) => sum + (j.data().photoCount || 0), 0);

        return {
          id: doc.id,
          name: data.name || "",
          email: data.email || "",
          joinCode: data.joinCode || "",
          jobCount,
          photoCount,
          createdAt: toDate(data.createdAt),
        };
      })
    );

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}
