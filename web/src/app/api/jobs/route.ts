import { NextRequest, NextResponse } from "next/server";
import { fetchAllJobs } from "@/lib/firestore-helpers";

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
      filtered = filtered.filter((j) => j.rebateOutcome === rebate);
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
