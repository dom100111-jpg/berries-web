import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("transit_pass_requests")
      .select(
        "id, trip_id, airport_name, request_status, pass_status, airport_note, approved_at, rejected_at, updated_at, qr_pass_id"
      )
      .in("request_status", ["approved", "rejected"])
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      requests: data ?? [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Server error" },
      { status: 500 }
    );
  }
}