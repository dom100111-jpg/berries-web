import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type TransitDocument = {
  id: string;
  trip_id: string;
  document_type: string | null;
  file_name: string | null;
  verified: boolean | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawToken = String(body?.token ?? "").trim();
    const scanMode = String(body?.scan_mode ?? "airport").trim();
    const verifierType = String(body?.verifier_type ?? "airport_staff").trim();

    if (!rawToken) {
      return NextResponse.json(
        { ok: false, error: "Token is required." },
        { status: 400 }
      );
    }

    const token = rawToken.includes("/transit/pass/")
      ? rawToken.split("/transit/pass/")[1]?.split("?")[0] ?? rawToken
      : rawToken;

    const { data: passes, error: passError } = await supabase
      .from("transit_qr_passes")
      .select("*")
      .ilike("qr_code_value", `%${token}%`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (passError) {
      return NextResponse.json(
        { ok: false, error: passError.message },
        { status: 500 }
      );
    }

    const passRow = passes?.[0] ?? null;

    if (!passRow) {
      return NextResponse.json(
        {
          ok: true,
          verified: false,
          status: "PASS_NOT_FOUND",
          message: "Transit pass not found.",
        },
        { status: 200 }
      );
    }

    const { data: trip, error: tripError } = await supabase
      .from("transit_trips")
      .select(
        "id, title, departure_city, destination_city, airline, flight_number, hotel_name"
      )
      .eq("id", passRow.trip_id)
      .maybeSingle();

    if (tripError) {
      return NextResponse.json(
        { ok: false, error: tripError.message },
        { status: 500 }
      );
    }

    const { data: docsRaw, error: docsError } = await supabase
      .from("transit_documents")
      .select("id, trip_id, document_type, file_name, verified")
      .eq("trip_id", passRow.trip_id)
      .order("created_at", { ascending: false });

    if (docsError) {
      return NextResponse.json(
        { ok: false, error: docsError.message },
        { status: 500 }
      );
    }

    const docs = (docsRaw ?? []) as TransitDocument[];

    const hasType = (type: string) =>
      docs.some((doc) => (doc.document_type ?? "").toLowerCase() === type);

    const readiness = {
      passport: hasType("passport"),
      visa: hasType("visa"),
      ticket: hasType("ticket"),
      hotel_booking: hasType("hotel_booking"),
      vaccination: hasType("vaccination"),
    };

    const requiredReady =
      readiness.passport && readiness.ticket && readiness.hotel_booking;

    const isActive = !!passRow.is_active;

    let status = "VERIFIED";
    let message = "Transit pass is valid.";

    if (!isActive) {
      status = "PASS_INACTIVE";
      message = "Transit pass is inactive.";
    } else if (!requiredReady) {
      status = "DOCUMENTS_MISSING";
      message = "Transit pass is active, but required documents are missing.";
    }

    const verified = isActive && requiredReady;

    await supabase.from("transit_pass_scans").insert({
      pass_id: passRow.id,
      token,
      scan_mode: scanMode,
      verifier_type: verifierType,
      verified,
      result_status: status,
      notes: message,
    });

    const { count: totalScans } = await supabase
      .from("transit_pass_scans")
      .select("*", { count: "exact", head: true })
      .eq("pass_id", passRow.id);

    return NextResponse.json({
      ok: true,
      verified,
      status,
      message,
      token,
      total_scans: totalScans ?? 0,
      pass: {
        id: passRow.id,
        is_active: passRow.is_active,
        created_at: passRow.created_at,
        expires_at: passRow.expires_at ?? null,
      },
      trip: {
        title: trip?.title ?? "Untitled trip",
        departure_city: trip?.departure_city ?? "Unknown",
        destination_city: trip?.destination_city ?? "Unknown",
        airline: trip?.airline ?? null,
        flight_number: trip?.flight_number ?? null,
        hotel_name: trip?.hotel_name ?? null,
      },
      readiness,
      documents: docs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to verify transit pass.",
      },
      { status: 500 }
    );
  }
}