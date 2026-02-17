import { NextRequest, NextResponse } from "next/server";
import { fetchFilteredJobs } from "@/lib/firestore-helpers";
import { db } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { getAuthSession } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { streetAddress, city, state, zipCode, contactName, contactPhone, contactEmail, notes, latitude, longitude } = body;

    if (!streetAddress || typeof streetAddress !== "string" || !streetAddress.trim()) {
      return NextResponse.json({ error: "Street address is required" }, { status: 400 });
    }

    const jobId = randomUUID().toUpperCase();
    const now = Timestamp.now();
    const docRef = db.collection("jobs").doc(jobId);

    await docRef.set({
      id: jobId,
      streetAddress: streetAddress.trim(),
      city: (city || "").trim(),
      state: (state || "").trim(),
      zipCode: (zipCode || "").trim(),
      contactName: (contactName || "").trim(),
      contactPhone: (contactPhone || "").trim(),
      contactEmail: (contactEmail || "").trim(),
      notes: (notes || "").trim(),
      currentStage: "Audit Pending",
      rebateAmount: 0,
      rebateStatus: "None",
      latitude: typeof latitude === "number" ? latitude : null,
      longitude: typeof longitude === "number" ? longitude : null,
      spots: [],
      formCount: 0,
      photoCount: 0,
      issueCount: 0,
      fixCount: 0,
      companyId: session.companyId,
      createdAt: now,
      updatedAt: now,
      stageHistory: [{ stage: "Audit Pending", date: now.toDate().toISOString() }],
      activityLog: [{
        id: `job-created-${jobId}`,
        type: "job_created",
        title: "New job created",
        subtitle: streetAddress.trim(),
        date: now.toDate().toISOString(),
        icon: "briefcase",
        color: "#FF6B35",
      }],
    });

    return NextResponse.json({ id: jobId }, { status: 201 });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const filterCompany = url.searchParams.get("companyId");
    const result = await fetchFilteredJobs({
      search: url.searchParams.get("search") || undefined,
      stage: url.searchParams.get("stage") || undefined,
      rebate: url.searchParams.get("rebate") || undefined,
      sort: url.searchParams.get("sort") || "newest",
      page: parseInt(url.searchParams.get("page") || "1"),
      limit: parseInt(url.searchParams.get("limit") || "50"),
      companyId: session.isAdmin ? (filterCompany || undefined) : session.companyId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
