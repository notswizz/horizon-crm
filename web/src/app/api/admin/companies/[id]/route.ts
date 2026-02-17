import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { getAuthSession } from "@/lib/auth-helpers";
import { toDate } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { id } = await params;

    const companyDoc = await db.collection("companies").doc(id).get();
    if (!companyDoc.exists) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const data = companyDoc.data()!;
    const company = {
      id: companyDoc.id,
      name: data.name || "",
      email: data.email || "",
      joinCode: data.joinCode || "",
      createdAt: toDate(data.createdAt),
    };

    const usersSnap = await db.collection("users").where("companyId", "==", id).get();
    const members = usersSnap.docs.map((doc) => {
      const u = doc.data();
      return {
        uid: doc.id,
        email: u.email || "",
        displayName: u.displayName || "",
        webAccess: u.webAccess || false,
        role: u.role || "user",
      };
    });

    return NextResponse.json({ company, members });
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json({ error: "Failed to fetch company" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { id } = await params;

    const companyDoc = await db.collection("companies").doc(id).get();
    if (!companyDoc.exists) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Delete all jobs and their forms subcollections
    const jobsSnap = await db.collection("jobs").where("companyId", "==", id).get();
    let deletedJobs = 0;

    for (const jobDoc of jobsSnap.docs) {
      const formsSnap = await db.collection("jobs").doc(jobDoc.id).collection("forms").get();
      const batch = db.batch();
      formsSnap.docs.forEach((formDoc) => batch.delete(formDoc.ref));
      batch.delete(jobDoc.ref);
      await batch.commit();
      deletedJobs++;
    }

    // Delete all users belonging to this company
    const usersSnap = await db.collection("users").where("companyId", "==", id).get();
    let deletedUsers = 0;

    const userBatch = db.batch();
    usersSnap.docs.forEach((doc) => {
      userBatch.delete(doc.ref);
      deletedUsers++;
    });
    await userBatch.commit();

    // Delete the company doc
    await db.collection("companies").doc(id).delete();

    return NextResponse.json({ success: true, deleted: { jobs: deletedJobs, users: deletedUsers } });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { id } = await params;
    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const companyDoc = await db.collection("companies").doc(id).get();
    if (!companyDoc.exists) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    await db.collection("companies").doc(id).update({ name });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}
