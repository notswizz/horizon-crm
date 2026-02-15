import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession } from "@/lib/auth-helpers";

const IMPERSONATE_COOKIE = "impersonate_company";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { companyId } = await req.json();
    const cookieStore = await cookies();

    if (!companyId) {
      // Clear impersonation
      cookieStore.set(IMPERSONATE_COOKIE, "", {
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });
      return NextResponse.json({ success: true, impersonating: null });
    }

    // Set impersonation cookie
    cookieStore.set(IMPERSONATE_COOKIE, companyId, {
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ success: true, impersonating: companyId });
  } catch (error) {
    console.error("Impersonation error:", error);
    return NextResponse.json({ error: "Failed to set impersonation" }, { status: 500 });
  }
}
