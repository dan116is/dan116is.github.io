import { NextRequest, NextResponse } from "next/server";
import { invalidateSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session")?.value;

    if (sessionToken) {
      await invalidateSession(sessionToken);
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });

    response.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Logout]", error);
    return NextResponse.json(
      { error: "Logout failed. Please try again." },
      { status: 500 }
    );
  }
}

// Also support DELETE for REST semantics (deletes the session resource)
export async function DELETE(req: NextRequest) {
  return POST(req);
}
