import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function makeAirportResultToken() {
  return `airport-result-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      action,
      requestId,
      tripId,
      documentId,
      verified,
      airportNote,
    } = body ?? {};

    if (action === "toggle_document") {
      if (!documentId || typeof verified !== "boolean") {
        return NextResponse.json(
          { ok: false, error: "Missing documentId or verified" },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("transit_documents")
        .update({
          verified,
        })
        .eq("id", documentId);

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (!requestId || !tripId) {
      return NextResponse.json(
        { ok: false, error: "Missing requestId or tripId" },
        { status: 400 }
      );
    }

    if (action === "open_under_review") {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("transit_pass_requests")
        .update({
          request_status: "under_review",
          reviewed_at: now,
        })
        .eq("id", requestId)
        .eq("trip_id", tripId);

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "approve") {
      const { data: requestRow, error: requestReadError } = await supabase
        .from("transit_pass_requests")
        .select("id, user_id, trip_id")
        .eq("id", requestId)
        .eq("trip_id", tripId)
        .maybeSingle();

      if (requestReadError) {
        return NextResponse.json(
          { ok: false, error: requestReadError.message },
          { status: 500 }
        );
      }

      if (!requestRow) {
        return NextResponse.json(
          { ok: false, error: "Request not found." },
          { status: 404 }
        );
      }

      const airportToken = makeAirportResultToken();

      const { error: deactivateError } = await supabase
        .from("transit_qr_passes")
        .update({
          is_active: false,
        })
        .eq("trip_id", tripId)
        .eq("is_active", true);

      if (deactivateError) {
        return NextResponse.json(
          { ok: false, error: deactivateError.message },
          { status: 500 }
        );
      }

      const { data: passRow, error: passInsertError } = await supabase
        .from("transit_qr_passes")
        .insert({
          trip_id: tripId,
          user_id: requestRow.user_id,
          qr_code_value: airportToken,
          is_active: true,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select(
          "id, trip_id, user_id, qr_code_value, is_active, expires_at, created_at"
        )
        .single();

      if (passInsertError || !passRow) {
        return NextResponse.json(
          {
            ok: false,
            error:
              passInsertError?.message || "Failed to create airport QR pass.",
          },
          { status: 500 }
        );
      }

      const approvedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("transit_pass_requests")
        .update({
          request_status: "approved",
          pass_status: "granted",
          approved_at: approvedAt,
          reviewed_at: approvedAt,
          qr_pass_id: passRow.id,
          airport_note:
            typeof airportNote === "string" && airportNote.trim()
              ? airportNote.trim()
              : "Approved for travel.",
        })
        .eq("id", requestId)
        .eq("trip_id", tripId);

      if (updateError) {
        return NextResponse.json(
          { ok: false, error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        airport_qr_token: passRow.qr_code_value,
        qr_pass_id: passRow.id,
      });
    }

    if (action === "reject") {
      const rejectedAt = new Date().toISOString();
      const finalRejectNote =
        typeof airportNote === "string" && airportNote.trim()
          ? airportNote.trim()
          : "Airport review rejected this request.";

      const { error } = await supabase
        .from("transit_pass_requests")
        .update({
          request_status: "rejected",
          pass_status: "revoked",
          rejected_at: rejectedAt,
          reviewed_at: rejectedAt,
          airport_note: finalRejectNote,
        })
        .eq("id", requestId)
        .eq("trip_id", tripId);

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Server error" },
      { status: 500 }
    );
  }
}