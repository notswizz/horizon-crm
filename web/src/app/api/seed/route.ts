import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { getAuthSession } from "@/lib/auth-helpers";

function uid() {
  return randomUUID().toUpperCase();
}

function ts(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return Timestamp.fromDate(d);
}

// ─── Unsplash photo URLs (free, no auth) ─────────────────────────────
const HOUSES = [
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
  "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
  "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80",
  "https://images.unsplash.com/photo-1598228723793-52759bba239c?w=800&q=80",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80",
  "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&q=80",
  "https://images.unsplash.com/photo-1602343168117-bb8bbe693b0c?w=800&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80",
  "https://images.unsplash.com/photo-1575517111478-7f6afd0973db?w=800&q=80",
];

const ISSUE_PHOTOS = [
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80",
  "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80",
  "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80",
  "https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=600&q=80",
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=80",
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80",
  "https://images.unsplash.com/photo-1631545806609-cf4e2e685546?w=600&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80",
  "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80",
  "https://images.unsplash.com/photo-1585128792020-803d29415281?w=600&q=80",
  "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&q=80",
  "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=600&q=80",
  "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600&q=80",
];

const FIX_PHOTOS = [
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80",
  "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80",
  "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80",
  "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80",
  "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=600&q=80",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&q=80",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
  "https://images.unsplash.com/photo-1600607688960-e095ff83135c?w=600&q=80",
];

// ─── Seed Data ───────────────────────────────────────────────────────

interface JobDef {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  stage: string;
  rebateStatus: string;
  rebateAmount: number;
  houseIdx: number;
  spots: { title: string; jobType: string }[];
}

const JOBS: JobDef[] = [
  {
    streetAddress: "245 Devin Place",
    city: "Atlanta",
    state: "GA",
    zipCode: "30316",
    contactName: "Marcus Johnson",
    contactPhone: "404-555-0142",
    contactEmail: "marcus.j@email.com",
    notes: "Homeowner reports high energy bills. Suspects poor attic insulation.",
    stage: "Completed",
    rebateStatus: "accepted",
    rebateAmount: 5000,
    houseIdx: 0,
    spots: [
      { title: "Attic - Main", jobType: "Attic Insulation" },
      { title: "Attic - Garage", jobType: "Attic Insulation" },
      { title: "Front Windows", jobType: "Air Sealing" },
    ],
  },
  {
    streetAddress: "1842 Peachtree Road NW",
    city: "Atlanta",
    state: "GA",
    zipCode: "30309",
    contactName: "Sarah Mitchell",
    contactPhone: "404-555-0287",
    contactEmail: "sarah.m@gmail.com",
    notes: "Large Victorian home. Multiple air sealing issues found during initial walkthrough.",
    stage: "Inspection Pending",
    rebateStatus: "none",
    rebateAmount: 0,
    houseIdx: 1,
    spots: [
      { title: "Master Bedroom Windows", jobType: "Air Sealing" },
      { title: "Kitchen Exterior Wall", jobType: "Air Sealing" },
      { title: "Basement Door Frame", jobType: "Weatherization" },
      { title: "Attic Hatch", jobType: "Attic Insulation" },
    ],
  },
  {
    streetAddress: "567 Moreland Ave SE",
    city: "Atlanta",
    state: "GA",
    zipCode: "30316",
    contactName: "David Chen",
    contactPhone: "470-555-0193",
    contactEmail: "dchen@outlook.com",
    notes: "New HVAC system installed. Needs final inspection before rebate approval.",
    stage: "Work In Progress",
    rebateStatus: "none",
    rebateAmount: 0,
    houseIdx: 2,
    spots: [
      { title: "Main HVAC Unit", jobType: "HVAC Installation" },
      { title: "Supply Ducts - 2nd Floor", jobType: "Duct Sealing" },
    ],
  },
  {
    streetAddress: "329 Boulevard NE",
    city: "Atlanta",
    state: "GA",
    zipCode: "30312",
    contactName: "Angela Williams",
    contactPhone: "678-555-0331",
    contactEmail: "angela.w@yahoo.com",
    notes: "Crawlspace encapsulation project. Moisture issues in crawlspace causing mold concerns.",
    stage: "Completed",
    rebateStatus: "accepted",
    rebateAmount: 3200,
    houseIdx: 3,
    spots: [
      { title: "Crawlspace - North", jobType: "Crawlspace Encapsulation" },
      { title: "Crawlspace - South", jobType: "Crawlspace Encapsulation" },
      { title: "Floor Insulation", jobType: "Insulation" },
    ],
  },
  {
    streetAddress: "1100 Euclid Ave NE",
    city: "Atlanta",
    state: "GA",
    zipCode: "30307",
    contactName: "James Rivera",
    contactPhone: "404-555-0478",
    contactEmail: "jrivera@email.com",
    notes: "",
    stage: "Audit Pending",
    rebateStatus: "none",
    rebateAmount: 0,
    houseIdx: 4,
    spots: [
      { title: "Living Room", jobType: "Insulation" },
      { title: "Kitchen", jobType: "Air Sealing" },
    ],
  },
  {
    streetAddress: "2201 Lavista Road",
    city: "Decatur",
    state: "GA",
    zipCode: "30033",
    contactName: "Patricia Hughes",
    contactPhone: "770-555-0562",
    contactEmail: "phughes@gmail.com",
    notes: "Duct sealing needed throughout. Older ductwork with visible tape repairs.",
    stage: "Inspection Pending",
    rebateStatus: "none",
    rebateAmount: 0,
    houseIdx: 5,
    spots: [
      { title: "Main Trunk Line", jobType: "Duct Sealing" },
      { title: "Branch Lines - Bedrooms", jobType: "Duct Sealing" },
      { title: "Return Air Plenum", jobType: "Duct Sealing" },
    ],
  },
  // ─── 10 NEW JOBS ─────────────────────────────────────────────────
  {
    streetAddress: "410 Ponce De Leon Ave",
    city: "Atlanta",
    state: "GA",
    zipCode: "30308",
    contactName: "Terrence Gray",
    contactPhone: "404-555-0811",
    contactEmail: "tgray@proton.me",
    notes: "1920s bungalow. Zero wall insulation confirmed by thermal camera. Full retrofit needed.",
    stage: "Work In Progress",
    rebateStatus: "none",
    rebateAmount: 0,
    houseIdx: 6,
    spots: [
      { title: "North Wall Cavity", jobType: "Insulation" },
      { title: "South Wall Cavity", jobType: "Insulation" },
      { title: "Rim Joist - Basement", jobType: "Air Sealing" },
    ],
  },
  {
    streetAddress: "88 Howell Mill Road",
    city: "Atlanta",
    state: "GA",
    zipCode: "30318",
    contactName: "Nina Kowalski",
    contactPhone: "404-555-0944",
    contactEmail: "nina.k@icloud.com",
    notes: "Townhome with shared walls. Ductwork in unconditioned attic losing efficiency.",
    stage: "Completed",
    rebateStatus: "accepted",
    rebateAmount: 2800,
    houseIdx: 7,
    spots: [
      { title: "Attic Ductwork", jobType: "Duct Sealing" },
      { title: "Attic Floor - Blown In", jobType: "Attic Insulation" },
    ],
  },
  {
    streetAddress: "1523 Memorial Drive SE",
    city: "Atlanta",
    state: "GA",
    zipCode: "30317",
    contactName: "Robert Okafor",
    contactPhone: "678-555-0217",
    contactEmail: "rokafor@gmail.com",
    notes: "Elderly homeowner, fixed income. Prioritize most impactful upgrades for rebate qualification.",
    stage: "Completed",
    rebateStatus: "accepted",
    rebateAmount: 4500,
    houseIdx: 8,
    spots: [
      { title: "Attic - Full", jobType: "Attic Insulation" },
      { title: "Front Door", jobType: "Weatherization" },
      { title: "Bathroom Exhaust Penetration", jobType: "Air Sealing" },
      { title: "Kitchen Window", jobType: "Air Sealing" },
    ],
  },
  {
    streetAddress: "742 Ralph McGill Blvd",
    city: "Atlanta",
    state: "GA",
    zipCode: "30312",
    contactName: "Lisa Tran",
    contactPhone: "470-555-0388",
    contactEmail: "ltran@outlook.com",
    notes: "Condo unit. HVAC replacement — old 10 SEER unit. HOA approval obtained.",
    stage: "Inspection Pending",
    rebateStatus: "none",
    rebateAmount: 0,
    houseIdx: 9,
    spots: [
      { title: "Heat Pump - Exterior", jobType: "HVAC Installation" },
      { title: "Air Handler - Closet", jobType: "HVAC Installation" },
      { title: "Thermostat Location", jobType: "HVAC Installation" },
    ],
  },
  {
    streetAddress: "205 Arizona Ave NE",
    city: "Atlanta",
    state: "GA",
    zipCode: "30307",
    contactName: "Derek Washington",
    contactPhone: "404-555-0655",
    contactEmail: "dwash@email.com",
    notes: "Craftsman bungalow. Crawlspace has standing water after rain events. Needs full encapsulation plus sump.",
    stage: "Work In Progress",
    rebateStatus: "none",
    rebateAmount: 0,
    houseIdx: 10,
    spots: [
      { title: "Crawlspace - Full", jobType: "Crawlspace Encapsulation" },
      { title: "Crawlspace Vents", jobType: "Air Sealing" },
      { title: "Floor Joists", jobType: "Insulation" },
    ],
  },
  {
    streetAddress: "3344 Clairmont Road",
    city: "Brookhaven",
    state: "GA",
    zipCode: "30329",
    contactName: "Yuki Tanaka",
    contactPhone: "770-555-0773",
    contactEmail: "ytanaka@gmail.com",
    notes: "Split-level home. Upper and lower attics need separate treatment. Recessed lights causing air leaks.",
    stage: "Audit Pending",
    rebateStatus: "none",
    rebateAmount: 0,
    houseIdx: 11,
    spots: [
      { title: "Upper Attic", jobType: "Attic Insulation" },
      { title: "Lower Attic", jobType: "Attic Insulation" },
      { title: "Recessed Lights - Kitchen", jobType: "Air Sealing" },
    ],
  },
  {
    streetAddress: "901 Flat Shoals Ave",
    city: "Atlanta",
    state: "GA",
    zipCode: "30316",
    contactName: "Carmen Reyes",
    contactPhone: "404-555-0129",
    contactEmail: "creyes@yahoo.com",
    notes: "Duplex — left unit only. Tenant complaints about drafts and high heating bills.",
    stage: "Completed",
    rebateStatus: "declined",
    rebateAmount: 0,
    houseIdx: 12,
    spots: [
      { title: "Living Room Windows", jobType: "Weatherization" },
      { title: "Exterior Door - Front", jobType: "Weatherization" },
      { title: "Exterior Door - Back", jobType: "Weatherization" },
      { title: "Attic Access", jobType: "Attic Insulation" },
    ],
  },
  {
    streetAddress: "1678 Briarcliff Road NE",
    city: "Atlanta",
    state: "GA",
    zipCode: "30306",
    contactName: "Michael Odom",
    contactPhone: "404-555-0492",
    contactEmail: "modom@proton.me",
    notes: "Ranch home. Ducts in crawlspace severely deteriorated. Full duct replacement recommended.",
    stage: "Work In Progress",
    rebateStatus: "none",
    rebateAmount: 0,
    houseIdx: 13,
    spots: [
      { title: "Supply Trunk - Crawlspace", jobType: "Duct Sealing" },
      { title: "Return Trunk - Crawlspace", jobType: "Duct Sealing" },
      { title: "Branch Runs - Bedrooms", jobType: "Duct Sealing" },
      { title: "Crawlspace Vapor Barrier", jobType: "Crawlspace Encapsulation" },
    ],
  },
  {
    streetAddress: "456 Glenwood Ave SE",
    city: "Atlanta",
    state: "GA",
    zipCode: "30316",
    contactName: "Aisha Patel",
    contactPhone: "678-555-0836",
    contactEmail: "apatel@gmail.com",
    notes: "New construction quality check. Builder cut corners on insulation and air sealing per homeowner.",
    stage: "Audit Pending",
    rebateStatus: "none",
    rebateAmount: 0,
    houseIdx: 14,
    spots: [
      { title: "Garage Ceiling", jobType: "Insulation" },
      { title: "Bonus Room Above Garage", jobType: "Insulation" },
      { title: "Can Lights - Throughout", jobType: "Air Sealing" },
      { title: "HVAC Closet", jobType: "Duct Sealing" },
    ],
  },
  {
    streetAddress: "2900 Pharr Court South",
    city: "Atlanta",
    state: "GA",
    zipCode: "30305",
    contactName: "William Duarte",
    contactPhone: "404-555-0371",
    contactEmail: "wduarte@email.com",
    notes: "High-rise condo. Limited scope — HVAC and window sealing only. Building engineer must be present.",
    stage: "Completed",
    rebateStatus: "accepted",
    rebateAmount: 1800,
    houseIdx: 15,
    spots: [
      { title: "HVAC Package Unit", jobType: "HVAC Installation" },
      { title: "Balcony Door Seal", jobType: "Air Sealing" },
    ],
  },
];

const INSPECTORS = ["J. Swizz", "Mike Torres", "Carlos Reyes", "Kim Patel", "Dana Brooks", "Alex Nguyen"];

const ISSUE_CONFIGS: Record<string, { categories: string[]; notes: string[] }> = {
  "Attic Insulation": {
    categories: ["Gaps in Insulation", "Insufficient R-Value", "Blocked Vents/Soffits", "Moisture/Contamination"],
    notes: [
      "Large gaps visible between batts near eaves",
      "Existing insulation only R-13, needs R-38 minimum",
      "Soffit vents covered by blown-in insulation",
      "Moisture staining on insulation near bathroom exhaust",
      "Insulation displaced around HVAC platform, 3ft gap exposed",
      "Vermiculite insulation present — potential asbestos, flagged for testing",
    ],
  },
  "Air Sealing": {
    categories: ["Missing Caulk/Sealant", "Gaps at Penetrations", "Missing Weatherstripping", "Incomplete Foam Application"],
    notes: [
      "No caulk around window frame — daylight visible",
      "1/4 inch gap around electrical penetration",
      "Weatherstripping deteriorated, not sealing properly",
      "Plumbing penetration through top plate completely open to attic",
      "Can light housing not IC-rated and unsealed, hot air leaking into attic",
      "Recessed medicine cabinet creating direct air path to wall cavity",
    ],
  },
  "HVAC Installation": {
    categories: ["Unit Not Level", "Line Insulation Missing", "Electrical Issue", "Improper Clearance", "No Condensate P-Trap"],
    notes: [
      "Condenser pad settling, unit tilted 3 degrees",
      "Refrigerant line insulation missing for 6 ft run",
      "Disconnect switch not properly grounded",
      "Unit installed too close to fence — insufficient airflow clearance",
      "Condensate drain has no P-trap, sewer gas potential",
      "Filter access panel doesn't seal flush, air bypassing filter",
    ],
  },
  "Duct Sealing": {
    categories: ["Tape Instead of Mastic", "Unsealed Joints", "Disconnected Duct Run", "Missing Duct Insulation", "Improper Duct Support"],
    notes: [
      "Foil tape used instead of mastic at main trunk connection",
      "Boot-to-register connection unsealed, significant leakage",
      "Flex duct disconnected from branch takeoff in attic",
      "6-inch flex run kinked at 90 degrees, nearly closed off",
      "Duct insulation torn open exposing inner liner to unconditioned space",
      "Return air duct pulling apart at joint, 2-inch gap visible",
    ],
  },
  "Crawlspace Encapsulation": {
    categories: ["Vapor Barrier Issue", "Moisture/Contamination", "Gaps in Insulation", "Safety Hazard"],
    notes: [
      "Vapor barrier not sealed at foundation walls, open seams",
      "Standing water present, vapor barrier floating in sections",
      "Floor insulation falling down, missing support wires",
      "Active water intrusion at north foundation wall — needs grading fix first",
      "Existing barrier has multiple tears and is not continuous",
      "Pest damage to existing vapor barrier, droppings present throughout",
    ],
  },
  Insulation: {
    categories: ["Gaps in Insulation", "Insulation Compression", "Insufficient R-Value", "Moisture/Contamination"],
    notes: [
      "Batt insulation compressed behind wiring runs",
      "Missing insulation section along exterior wall",
      "Blown-in settled significantly, only 4 inches remaining",
      "R-11 in walls where R-19 is required by current code",
      "Fiberglass batts installed backwards — vapor barrier facing wrong direction",
      "Thermal bridging at studs clearly visible on IR camera",
    ],
  },
  Weatherization: {
    categories: ["Missing Weatherstripping", "Missing Caulk/Sealant", "Incomplete Work", "Safety Hazard"],
    notes: [
      "Door sweep missing on exterior door",
      "Caulk cracked and separated at window sill",
      "Foam sealant only partially applied around pipe chase",
      "Storm door latch broken, not closing fully",
      "Threshold worn down, 3/8 inch gap under door",
      "Window glazing compound deteriorated, panes loose in frame",
    ],
  },
};

const RESOLUTIONS = [
  "Sealed with closed-cell spray foam, verified with blower door",
  "Installed new R-38 blown-in insulation to full depth",
  "Applied mastic sealant to all joints per spec",
  "Replaced deteriorated weatherstripping with new silicone",
  "Reconnected and sealed with mastic and mesh tape",
  "Leveled unit on new composite pad, verified with level",
  "Installed proper vapor barrier with sealed seams and termination",
  "Applied caulk and foam sealant, confirmed no daylight visible",
  "Insulated line set with proper thickness foam insulation",
  "Corrected electrical grounding per NEC requirements",
  "Installed IC-rated airtight housing, sealed with fire-rated caulk",
  "Dense-packed cellulose into wall cavity, confirmed with density test",
  "Replaced flex duct with rigid metal, properly supported every 4ft",
  "Installed new door sweep and adjustable threshold, gap eliminated",
  "Wrapped duct with R-8 insulation, all seams taped and sealed",
  "Installed sump pump and dehumidifier, moisture reading now under 50%",
];

function buildJobData(jobDef: JobDef, daysAgo: number) {
  const jobId = uid();
  const address = `${jobDef.streetAddress}, ${jobDef.city}, ${jobDef.state} ${jobDef.zipCode}`;

  const spots = jobDef.spots.map((s) => ({ id: uid(), ...s }));

  // Build audit form with issues (skip for Audit Pending jobs — they have no forms yet)
  const hasAudit = jobDef.stage !== "Audit Pending";

  const auditFormId = uid();
  const auditSpots = hasAudit ? spots.map((spot, si) => buildAuditSpot(spot, si)) : [];
  const auditIssues = auditSpots.flatMap((s) => s.issuePhotos);

  // Build inspection form with fixes (only for jobs past audit stage)
  let inspectionForm = null;
  const needsInspection = ["Work In Progress", "Inspection Pending", "Completed"].includes(jobDef.stage);

  if (needsInspection && auditIssues.length > 0) {
    const inspFormId = uid();
    const fixSpots = auditSpots.map((auditSpot, si) =>
      buildFixSpot(auditSpot, si, jobDef.stage === "Completed")
    );
    const totalFixes = fixSpots.reduce((n, s) => n + s.fixPhotos.length, 0);

    inspectionForm = {
      id: inspFormId,
      formType: "Inspection",
      inspectorName: INSPECTORS[Math.floor(Math.random() * INSPECTORS.length)],
      date: ts(daysAgo - 3),
      notes: "",
      spots: fixSpots,
      _fixCount: totalFixes,
    };
  }

  const totalIssues = auditIssues.length;
  const totalFixes = inspectionForm?._fixCount ?? 0;
  const totalPhotos = totalIssues + totalFixes;

  const jobDoc = {
    id: jobId,
    streetAddress: jobDef.streetAddress,
    city: jobDef.city,
    state: jobDef.state,
    zipCode: jobDef.zipCode,
    address,
    contactName: jobDef.contactName,
    contactPhone: jobDef.contactPhone,
    contactEmail: jobDef.contactEmail,
    notes: jobDef.notes,
    currentStage: jobDef.stage,
    rebateAmount: jobDef.rebateAmount,
    rebateStatus: jobDef.rebateStatus,
    houseImageURL: HOUSES[jobDef.houseIdx % HOUSES.length],
    latitude: null,
    longitude: null,
    spots: spots.map((s) => ({ id: s.id, title: s.title, jobType: s.jobType })),
    formCount: hasAudit ? (inspectionForm ? 2 : 1) : 0,
    photoCount: totalPhotos,
    issueCount: totalIssues,
    fixCount: totalFixes,
    createdAt: ts(daysAgo),
    updatedAt: ts(daysAgo - 1),
  };

  const auditForm = hasAudit
    ? {
        id: auditFormId,
        formType: "Audit",
        inspectorName: INSPECTORS[Math.floor(Math.random() * INSPECTORS.length)],
        date: ts(daysAgo - 1),
        notes: "",
        spots: auditSpots,
      }
    : null;

  return { jobId, jobDoc, auditForm, inspectionForm };
}

const SEVERITIES: ("Critical" | "Major" | "Minor")[] = ["Major", "Minor", "Critical"];

function buildAuditSpot(spot: { id: string; title: string; jobType: string }, spotIdx: number) {
  const config = ISSUE_CONFIGS[spot.jobType] || ISSUE_CONFIGS["Insulation"];
  const numIssues = 1 + Math.floor(Math.random() * 2); // 1-2 issues per spot

  const issuePhotos = Array.from({ length: numIssues }, (_, i) => ({
    id: uid(),
    photoURL: ISSUE_PHOTOS[(spotIdx * 3 + i) % ISSUE_PHOTOS.length],
    category: config.categories[(spotIdx + i) % config.categories.length],
    severity: SEVERITIES[(spotIdx + i) % SEVERITIES.length],
    notes: config.notes[(spotIdx + i) % config.notes.length],
    dateTaken: ts(10 + spotIdx),
  }));

  return {
    id: spot.id,
    title: spot.title,
    jobType: spot.jobType,
    issuePhotos,
    fixPhotos: [] as Record<string, unknown>[],
    materials: [] as Record<string, unknown>[],
  };
}

function buildFixSpot(
  auditSpot: ReturnType<typeof buildAuditSpot>,
  spotIdx: number,
  allFixed: boolean
) {
  const issuesToFix = allFixed
    ? auditSpot.issuePhotos
    : auditSpot.issuePhotos.slice(0, Math.max(1, auditSpot.issuePhotos.length - (spotIdx % 2)));

  const fixPhotos = issuesToFix.map((issue, i) => ({
    id: uid(),
    linkedAuditIssueId: issue.id,
    photoURL: FIX_PHOTOS[(spotIdx * 2 + i) % FIX_PHOTOS.length],
    resolutionNotes: RESOLUTIONS[(spotIdx * 3 + i) % RESOLUTIONS.length],
    dateTaken: ts(5 + spotIdx),
  }));

  const materials =
    spotIdx === 0
      ? [
          {
            id: uid(),
            name: getMaterialName(auditSpot.jobType),
            type: getMaterialType(auditSpot.jobType),
            quantity: getQuantity(auditSpot.jobType),
            cost: 50 + Math.floor(Math.random() * 400),
          },
        ]
      : [];

  return {
    id: auditSpot.id,
    title: auditSpot.title,
    jobType: auditSpot.jobType,
    issuePhotos: [] as Record<string, unknown>[],
    fixPhotos,
    materials,
  };
}

function getMaterialName(jobType: string): string {
  const map: Record<string, string> = {
    "Attic Insulation": "Owens Corning R-38 Blown-In",
    "Air Sealing": "Great Stuff Pro Gaps & Cracks",
    "HVAC Installation": "Carrier Comfort 16 SEER2",
    "Duct Sealing": "Hardcast Mastic Sealant",
    "Crawlspace Encapsulation": "20-mil Vapor Barrier",
    Insulation: "CertainTeed R-19 Batts",
    Weatherization: "M-D Building Products Weatherstrip",
  };
  return map[jobType] || "General Supply";
}

function getMaterialType(jobType: string): string {
  const map: Record<string, string> = {
    "Attic Insulation": "Insulation",
    "Air Sealing": "Sealant",
    "HVAC Installation": "HVAC Unit",
    "Duct Sealing": "Sealant",
    "Crawlspace Encapsulation": "Other",
    Insulation: "Insulation",
    Weatherization: "Other",
  };
  return map[jobType] || "Other";
}

function getQuantity(jobType: string): string {
  const map: Record<string, string> = {
    "Attic Insulation": "22 bags",
    "Air Sealing": "6 cans",
    "HVAC Installation": "1 unit",
    "Duct Sealing": "2 buckets",
    "Crawlspace Encapsulation": "1200 sq ft",
    Insulation: "15 batts",
    Weatherization: "4 rolls",
  };
  return map[jobType] || "1 lot";
}

// ─── API Route ───────────────────────────────────────────────────────

export async function DELETE() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const counts: Record<string, number> = {};

    // Delete all jobs + their forms subcollections
    const jobsSnap = await db.collection("jobs").get();
    counts.jobs = jobsSnap.size;
    for (const doc of jobsSnap.docs) {
      const formsSnap = await doc.ref.collection("forms").get();
      for (const formDoc of formsSnap.docs) {
        await formDoc.ref.delete();
      }
      await doc.ref.delete();
    }

    // Delete all users
    const usersSnap = await db.collection("users").get();
    counts.users = usersSnap.size;
    for (const doc of usersSnap.docs) {
      await doc.ref.delete();
    }

    // Delete all companies
    const companiesSnap = await db.collection("companies").get();
    counts.companies = companiesSnap.size;
    for (const doc of companiesSnap.docs) {
      await doc.ref.delete();
    }

    return NextResponse.json({ success: true, deleted: counts });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const results: string[] = [];

    for (let i = 0; i < JOBS.length; i++) {
      const daysAgo = 60 - i * 3; // stagger creation dates over ~2 months
      const { jobId, jobDoc, auditForm, inspectionForm } = buildJobData(JOBS[i], daysAgo);

      await db.collection("jobs").doc(jobId).set(jobDoc);

      if (auditForm) {
        await db.collection("jobs").doc(jobId).collection("forms").doc(auditForm.id).set(auditForm);
      }

      if (inspectionForm) {
        const { _fixCount, ...formDoc } = inspectionForm;
        await db.collection("jobs").doc(jobId).collection("forms").doc(formDoc.id).set(formDoc);
      }

      const issueCount = auditForm?.spots.flatMap((s) => s.issuePhotos).length ?? 0;
      results.push(`${jobDoc.streetAddress} — ${issueCount} issues, ${inspectionForm?._fixCount ?? 0} fixes`);
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${JOBS.length} jobs`,
      details: results,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
