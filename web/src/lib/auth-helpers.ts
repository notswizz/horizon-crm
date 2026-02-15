import { cookies } from "next/headers";
import { auth, db } from "./firebase-admin";
import { AuthSession } from "@/types";

const ADMIN_EMAIL = "swizz@gmail.com";
const SESSION_COOKIE = "__session";
const IMPERSONATE_COOKIE = "impersonate_company";

export async function getAuthSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionCookie) return null;

    const decoded = await auth.verifySessionCookie(sessionCookie, true);

    // Look up user doc for companyId + role
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) {
      // User exists in Firebase Auth but hasn't onboarded yet
      return {
        uid: decoded.uid,
        email: decoded.email || "",
        companyId: "",
        companyName: "",
        role: decoded.email === ADMIN_EMAIL ? "admin" : "user",
        isAdmin: decoded.email === ADMIN_EMAIL,
        webAccess: decoded.email === ADMIN_EMAIL,
      };
    }

    const userData = userDoc.data()!;
    const isAdmin = decoded.email === ADMIN_EMAIL;

    let companyId = userData.companyId || "";
    let companyName = userData.companyName || "";

    // Admin impersonation: override companyId if impersonate cookie is set
    if (isAdmin) {
      const impersonateId = cookieStore.get(IMPERSONATE_COOKIE)?.value;
      if (impersonateId) {
        const companyDoc = await db.collection("companies").doc(impersonateId).get();
        if (companyDoc.exists) {
          companyId = impersonateId;
          companyName = companyDoc.data()!.name || companyName;
        }
      }
    }

    // Determine web access: explicit flag, platform admin, or company creator (legacy backfill)
    let webAccess = isAdmin || userData.webAccess === true;
    if (!webAccess && userData.webAccess === undefined && companyId) {
      // Legacy user without webAccess field — check if they're the company creator
      const companyDoc = await db.collection("companies").doc(companyId).get();
      if (companyDoc.exists && companyDoc.data()?.email === decoded.email) {
        webAccess = true;
      }
      // Backfill so this lookup doesn't repeat
      await db.collection("users").doc(decoded.uid).update({ webAccess });
    }

    return {
      uid: decoded.uid,
      email: decoded.email || "",
      companyId,
      companyName,
      role: userData.role || (isAdmin ? "admin" : "user"),
      isAdmin,
      webAccess,
    };
  } catch {
    return null;
  }
}
