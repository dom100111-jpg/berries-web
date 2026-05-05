import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("trip_id");

    if (tripId) {
      const { data: requestRows, error: requestError } = await supabase
        .from("transit_pass_requests")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (requestError) {
        return NextResponse.json(
          { ok: false, error: requestError.message },
          { status: 500 }
        );
      }

      const currentRequest = (requestRows ?? [])[0] ?? null;

      const { data: docs, error: docsError } = await supabase
        .from("transit_documents")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (docsError) {
        return NextResponse.json(
          { ok: false, error: docsError.message },
          { status: 500 }
        );
      }

      const { data: tripRows, error: tripError } = await supabase
        .from("transit_trips")
        .select("*")
        .eq("id", tripId)
        .limit(1);

      if (tripError) {
        return NextResponse.json(
          { ok: false, error: tripError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        request: currentRequest,
        trip: (tripRows ?? [])[0] ?? null,
        documents: docs ?? [],
      });
    }

    const { data, error } = await supabase
      .from("transit_pass_requests")
      .select("*")
      .in("request_status", ["pending_review", "under_review"])
      .order("created_at", { ascending: false });

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