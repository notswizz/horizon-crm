import { NextRequest, NextResponse } from "next/server";
import { fetchAllJobs } from "@/lib/firestore-helpers";
import { db } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { streetAddress, city, state, zipCode, contactName, contactPhone, contactEmail, notes, latitude, longitude } = body;

    if (!streetAddress || typeof streetAddress !== "string" || !streetAddress.trim()) {
      return NextResponse.json({ error: "Street address is required" }, { status: 400 });
    }

    // iOS uses UUID for document IDs and decodes id as UUID — must match
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
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id: jobId }, { status: 201 });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const jobs = await fetchAllJobs();

    // Apply filters from query params
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.toLowerCase();
    const stage = url.searchParams.get("stage");
    const rebate = url.searchParams.get("rebate");
    const sort = url.searchParams.get("sort") || "newest";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    let filtered = jobs;

    if (search) {
      filtered = filtered.filter(
        (j) =>
          j.address.toLowerCase().includes(search) ||
          j.contactName.toLowerCase().includes(search) ||
          j.contactEmail.toLowerCase().includes(search)
      );
    }

    if (stage) {
      filtered = filtered.filter((j) => j.currentStage === stage);
    }

    if (rebate) {
      filtered = filtered.filter((j) => j.rebateStatus === rebate);
    }

    // Sort
    switch (sort) {
      case "oldest":
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "address":
        filtered.sort((a, b) => a.address.localeCompare(b.address));
        break;
      case "issues":
        filtered.sort((a, b) => b.issueCount - a.issueCount);
        break;
      default: // newest
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return NextResponse.json({ jobs: paginated, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
