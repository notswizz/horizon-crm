import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { DropdownConfig, DatasetValuationConfig } from "@/types";
import { getAuthSession } from "@/lib/auth-helpers";

const CONFIG_DOC = "config/dropdowns";

const INSULATION_TYPES = ["Insulation", "Attic Insulation", "Crawlspace Encapsulation"];
const AIR_SEAL_TYPES = ["Air Sealing", "Weatherization"];

// Default values matching the iOS app enums + category→jobType mappings
const DEFAULTS: DropdownConfig = {
  jobTypes: [
    "Insulation",
    "Air Sealing",
    "HVAC Installation",
    "Duct Sealing",
    "Weatherization",
    "Attic Insulation",
    "Crawlspace Encapsulation",
  ],
  issueCategories: [
    // Insulation / Attic / Crawlspace
    { name: "Gaps in Insulation", jobTypes: INSULATION_TYPES },
    { name: "Insulation Compression", jobTypes: INSULATION_TYPES },
    { name: "Insufficient R-Value", jobTypes: INSULATION_TYPES },
    { name: "Blocked Vents/Soffits", jobTypes: INSULATION_TYPES },
    { name: "Moisture/Contamination", jobTypes: INSULATION_TYPES },
    { name: "Vapor Barrier Issue", jobTypes: INSULATION_TYPES },
    // Air Sealing / Weatherization
    { name: "Missing Caulk/Sealant", jobTypes: AIR_SEAL_TYPES },
    { name: "Gaps at Penetrations", jobTypes: AIR_SEAL_TYPES },
    { name: "Incomplete Foam Application", jobTypes: AIR_SEAL_TYPES },
    { name: "Over-Application/Mess", jobTypes: AIR_SEAL_TYPES },
    { name: "Missing Weatherstripping", jobTypes: AIR_SEAL_TYPES },
    // HVAC
    { name: "Unit Not Level", jobTypes: ["HVAC Installation"] },
    { name: "Line Insulation Missing", jobTypes: ["HVAC Installation"] },
    { name: "No Condensate P-Trap", jobTypes: ["HVAC Installation"] },
    { name: "Improper Clearance", jobTypes: ["HVAC Installation"] },
    { name: "Electrical Issue", jobTypes: ["HVAC Installation"] },
    // Duct
    { name: "Tape Instead of Mastic", jobTypes: ["Duct Sealing"] },
    { name: "Unsealed Joints", jobTypes: ["Duct Sealing"] },
    { name: "Disconnected Duct Run", jobTypes: ["Duct Sealing"] },
    { name: "Missing Duct Insulation", jobTypes: ["Duct Sealing"] },
    { name: "Improper Duct Support", jobTypes: ["Duct Sealing"] },
    // General (all types — empty array means applies to all)
    { name: "Code Violation", jobTypes: [] },
    { name: "Safety Hazard", jobTypes: [] },
    { name: "Incomplete Work", jobTypes: [] },
    { name: "Poor Workmanship", jobTypes: [] },
    { name: "Other", jobTypes: [] },
  ],
  materialTypes: [
    "Insulation",
    "Sealant",
    "HVAC Unit",
    "Ductwork",
    "Other",
  ],
};

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const doc = await db.doc(CONFIG_DOC).get();
    if (!doc.exists) {
      await db.doc(CONFIG_DOC).set(DEFAULTS);
      return NextResponse.json(DEFAULTS);
    }
    const data = doc.data() as Record<string, unknown>;
    // Normalize issueCategories: handle old flat string[] format and missing jobTypes
    let issueCategories = DEFAULTS.issueCategories;
    if (Array.isArray(data.issueCategories)) {
      issueCategories = (data.issueCategories as unknown[]).map((c) => {
        if (typeof c === "string") return { name: c, jobTypes: [] };
        const obj = c as { name?: string; jobTypes?: string[] };
        return { name: obj.name || "", jobTypes: obj.jobTypes || [] };
      });
    }
    return NextResponse.json({
      jobTypes: (data.jobTypes as string[]) || DEFAULTS.jobTypes,
      issueCategories,
      materialTypes: (data.materialTypes as string[]) || DEFAULTS.materialTypes,
      datasetValueWeights: data.datasetValueWeights || undefined,
      datasetValuation: (data.datasetValuation as DatasetValuationConfig) || undefined,
    });
  } catch (error) {
    console.error("Error fetching config:", error);
    return NextResponse.json(DEFAULTS);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const body = (await request.json()) as Partial<DropdownConfig>;
    const update: Partial<DropdownConfig> = {};

    if (body.jobTypes) update.jobTypes = body.jobTypes;
    if (body.issueCategories) update.issueCategories = body.issueCategories;
    if (body.materialTypes) update.materialTypes = body.materialTypes;
    if (body.datasetValueWeights) update.datasetValueWeights = body.datasetValueWeights;
    if (body.datasetValuation) update.datasetValuation = body.datasetValuation;

    await db.doc(CONFIG_DOC).set(update, { merge: true });

    const doc = await db.doc(CONFIG_DOC).get();
    return NextResponse.json(doc.data());
  } catch (error) {
    console.error("Error updating config:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
