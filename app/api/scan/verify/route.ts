import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

function normalizeToken(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();

  if (trimmed.includes("/transit/pass/")) {
    const part = trimmed.split("/transit/pass/")[1] ?? "";
    return part.split("?")[0].split("#")[0].trim() || null;
  }

  return trimmed;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawToken = String(body?.token ?? "");
    const scan_mode = String(body?.scan_mode ?? "airport");
    const verifier_type = String(body?.verifier_type ?? "airport_staff");

    const token = normalizeToken(rawToken);

    if (!token) {
      return NextResponse.json({
        ok: false,
        error: "Missing token",
      });
    }

    const { data: passRows, error: passError } = await supabase
      .from("transit_qr_passes")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (passError) {
      return NextResponse.json({
        ok: false,
        error: passError.message,
      });
    }

    const passRow =
      (passRows ?? []).find(
        (row: any) => normalizeToken(row?.qr_code_value) === token
      ) ?? null;

    if (!passRow) {
      return NextResponse.json({
        ok: true,
        verified: false,
        status: "NOT_FOUND",
        message: "Transit pass not found.",
        token,
        total_scans: 0,
        documents: [],
        trip: {
          title: "Untitled trip",
          departure_city: "Unknown",
          destination_city: "Unknown",
          airline: null,
          flight_number: null,
          hotel_name: null,
        },
        readiness: {
          passport: false,
          visa: false,
          ticket: false,
          hotel_booking: false,
          vaccination: false,
        },
      });
    }

    const isExpired =
      !!passRow?.expires_at &&
      new Date(passRow.expires_at).getTime() < Date.now();

    if (isExpired) {
      return NextResponse.json({
        ok: true,
        verified: false,
        status: "EXPIRED",
        message: "Transit pass has expired.",
        token,
        total_scans: 0,
        pass: {
          id: passRow.id,
          is_active: passRow.is_active,
          created_at: passRow.created_at,
          expires_at: passRow.expires_at,
        },
        documents: [],
        trip: {
          title: "Untitled trip",
          departure_city: "Unknown",
          destination_city: "Unknown",
          airline: null,
          flight_number: null,
          hotel_name: null,
        },
        readiness: {
          passport: false,
          visa: false,
          ticket: false,
          hotel_booking: false,
          vaccination: false,
        },
      });
    }

    await supabase.from("transit_qr_scans").insert({
      qr_pass_id: passRow.id,
      token,
      scan_mode,
      verifier_type,
      note: "Transit pass verified from live airport scanner dashboard",
    });

    const { count: scanCount } = await supabase
      .from("transit_qr_scans")
      .select("*", { count: "exact", head: true })
      .eq("qr_pass_id", passRow.id);

    const { data: tripRows, error: tripError } = await supabase
      .from("transit_trips")
      .select(
        "id, title, departure_city, destination_city, airline, flight_number, hotel_name"
      )
      .eq("id", String(passRow.trip_id))
      .limit(1);

    if (tripError) {
      return NextResponse.json({
        ok: false,
        error: tripError.message,
      });
    }

    const trip = (tripRows?.[0] ?? null) as {
      id: string;
      title: string | null;
      departure_city: string | null;
      destination_city: string | null;
      airline: string | null;
      flight_number: string | null;
      hotel_name: string | null;
    } | null;

    const { data: docs, error: docsError } = await supabase
      .from("transit_documents")
      .select("id, document_type, file_name, verified")
      .eq("trip_id", String(passRow.trip_id))
      .order("created_at", { ascending: false });

    if (docsError) {
      return NextResponse.json({
        ok: false,
        error: docsError.message,
      });
    }

    const documents = docs ?? [];

    const hasVerifiedType = (type: string) =>
      documents.some(
        (doc: any) =>
          (doc.document_type ?? "").toLowerCase() === type &&
          doc.verified === true
      );

    const readiness = {
      passport: hasVerifiedType("passport"),
      visa: hasVerifiedType("visa"),
      ticket: hasVerifiedType("ticket"),
      hotel_booking: hasVerifiedType("hotel_booking"),
      vaccination: hasVerifiedType("vaccination"),
    };

    const hasMinimumRequired =
      readiness.passport &&
      readiness.ticket &&
      readiness.hotel_booking;

    const verified = hasMinimumRequired;

    return NextResponse.json({
      ok: true,
      verified,
      status: verified ? "VERIFIED" : "REVIEW_REQUIRED",
      message: verified
        ? "Transit pass is active and required documents are available."
        : "Transit pass is active, but required documents are missing.",
      token,
      total_scans: scanCount ?? 0,
      pass: {
        id: passRow.id,
        is_active: passRow.is_active,
        created_at: passRow.created_at,
        expires_at: passRow.expires_at,
      },
      trip: trip
        ? {
            title: trip.title ?? "Untitled trip",
            departure_city: trip.departure_city ?? "Unknown",
            destination_city: trip.destination_city ?? "Unknown",
            airline: trip.airline ?? null,
            flight_number: trip.flight_number ?? null,
            hotel_name: trip.hotel_name ?? null,
          }
        : {
            title: "Untitled trip",
            departure_city: "Unknown",
            destination_city: "Unknown",
            airline: null,
            flight_number: null,
            hotel_name: null,
          },
      readiness,
      documents,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error?.message ?? "Verification failed",
    });
  }
}