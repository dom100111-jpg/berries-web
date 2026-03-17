import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { documentId, status } = body;

    if (!documentId || !status) {
      return NextResponse.json(
        { error: "Missing documentId or status" },
        { status: 400 }
      );
    }

    const verified = status === "verified";

    const { error } = await supabase
      .from("transit_documents")
      .update({ verified })
      .eq("id", documentId);

    if (error) {
      console.log("❌ Supabase error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, verified });
  } catch (err) {
    console.log("❌ Server crash:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}