import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeToken(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();

  if (trimmed.includes("/transit/pass/")) {
    const part = trimmed.split("/transit/pass/")[1] ?? "";
    return part.split("?")[0].split("#")[0].trim() || null;
  }

  return trimmed;
}

type TripRow = {
  id: string;
  title: string | null;
  departure_city: string | null;
  destination_city: string | null;
  airline: string | null;
  flight_number: string | null;
  hotel_name: string | null;
};

type DocumentRow = {
  id: string;
  document_type: string | null;
  file_name: string | null;
  verified: boolean | null;
};

type RequestRow = {
  id: string;
  trip_id: string | null;
  qr_pass_id: string | null;
  request_status: string | null;
  pass_status: string | null;
  airport_note: string | null;
  approved_at: string | null;
  rejected_at: string | null;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawToken = String(body?.token ?? "");
    const scan_mode = String(body?.scan_mode ?? "airport");

    const token = normalizeToken(rawToken);

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing token",
        },
        { status: 400 }
      );
    }

    const { data: passRows, error: passError } = await supabase
      .from("transit_qr_passes")
      .select("id, trip_id, user_id, qr_code_value, is_active, created_at, expires_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (passError) {
      return NextResponse.json(
        {
          ok: false,
          error: passError.message,
        },
        { status: 500 }
      );
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
        pass: null,
        trip: null,
        readiness: {
          passport: false,
          visa: false,
          ticket: false,
          hotel_booking: false,
          vaccination: false,
        },
        documents: [],
        request: null,
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
        trip: null,
        readiness: {
          passport: false,
          visa: false,
          ticket: false,
          hotel_booking: false,
          vaccination: false,
        },
        documents: [],
        request: null,
      });
    }

    let currentRequest: RequestRow | null = null;

    const { data: exactRequestRows, error: exactRequestError } = await supabase
      .from("transit_pass_requests")
      .select(
        "id, trip_id, qr_pass_id, request_status, pass_status, airport_note, approved_at, rejected_at"
      )
      .eq("qr_pass_id", passRow.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (exactRequestError) {
      return NextResponse.json(
        {
          ok: false,
          error: exactRequestError.message,
        },
        { status: 500 }
      );
    }

    currentRequest = ((exactRequestRows ?? [])[0] ?? null) as RequestRow | null;

    if (!currentRequest && passRow.trip_id) {
      const { data: fallbackRequestRows, error: fallbackRequestError } =
        await supabase
          .from("transit_pass_requests")
          .select(
            "id, trip_id, qr_pass_id, request_status, pass_status, airport_note, approved_at, rejected_at"
          )
          .eq("trip_id", String(passRow.trip_id))
          .order("created_at", { ascending: false })
          .limit(1);

      if (fallbackRequestError) {
        return NextResponse.json(
          {
            ok: false,
            error: fallbackRequestError.message,
          },
          { status: 500 }
        );
      }

      currentRequest = ((fallbackRequestRows ?? [])[0] ?? null) as RequestRow | null;
    }

    const tripId = String(passRow.trip_id ?? currentRequest?.trip_id ?? "").trim();

    if (!tripId) {
      return NextResponse.json({
        ok: true,
        verified: false,
        status: "INVALID_PASS",
        message: "Transit pass is missing trip connection.",
        token,
        total_scans: 0,
        pass: {
          id: passRow.id,
          is_active: passRow.is_active,
          created_at: passRow.created_at,
          expires_at: passRow.expires_at,
        },
        trip: null,
        readiness: {
          passport: false,
          visa: false,
          ticket: false,
          hotel_booking: false,
          vaccination: false,
        },
        documents: [],
        request: currentRequest,
      });
    }

    const { data: tripRows, error: tripError } = await supabase
      .from("transit_trips")
      .select(
        "id, title, departure_city, destination_city, airline, flight_number, hotel_name"
      )
      .eq("id", tripId)
      .limit(1);

    if (tripError) {
      return NextResponse.json(
        {
          ok: false,
          error: tripError.message,
        },
        { status: 500 }
      );
    }

    const trip = (tripRows?.[0] ?? null) as TripRow | null;

    const { data: docs, error: docsError } = await supabase
      .from("transit_documents")
      .select("id, document_type, file_name, verified")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (docsError) {
      return NextResponse.json(
        {
          ok: false,
          error: docsError.message,
        },
        { status: 500 }
      );
    }

    const documents = (docs ?? []) as DocumentRow[];

    const hasVerifiedType = (type: string) =>
      documents.some(
        (doc) =>
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

    const airportApproved =
      currentRequest?.pass_status === "granted" ||
      currentRequest?.request_status === "approved";

    const airportRejected =
      currentRequest?.request_status === "rejected" ||
      currentRequest?.pass_status === "revoked";

    const minimumVerified =
      readiness.passport &&
      readiness.ticket &&
      readiness.hotel_booking;

    let verified = false;
    let status = "REJECTED";
    let message = "Passenger is not cleared for transit.";

    if (airportApproved && minimumVerified) {
      verified = true;
      status = "VERIFIED";
      message =
        "Transit pass verified. Passenger may continue to physical boarding.";
    } else if (airportRejected) {
      verified = false;
      status = "REJECTED";
      message =
        currentRequest?.airport_note ||
        "Transit pass was rejected by airport review.";
    } else if (airportApproved && !minimumVerified) {
      verified = false;
      status = "DOCUMENT_MISMATCH";
      message =
        "Airport approved this request, but required verified documents are incomplete.";
    } else if (currentRequest?.request_status === "under_review") {
      verified = false;
      status = "UNDER_REVIEW";
      message = "Transit request is still under review.";
    } else if (currentRequest?.request_status === "pending_review") {
      verified = false;
      status = "PENDING_REVIEW";
      message = "Transit request is still waiting for airport review.";
    } else {
      verified = false;
      status = "REVIEW_REQUIRED";
      message = "This pass has not been airport-approved yet.";
    }

    const { error: scanInsertError } = await supabase
      .from("transit_qr_scans")
      .insert({
        qr_pass_id: passRow.id,
        token,
        scan_mode,
        note: verified
          ? "Final airport QR scanned and accepted"
          : `Final airport QR scanned with status ${status}`,
        scanned_at: new Date().toISOString(),
      });

    if (scanInsertError) {
      return NextResponse.json(
        {
          ok: false,
          error: scanInsertError.message,
        },
        { status: 500 }
      );
    }

    const { count: scanCount, error: scanCountError } = await supabase
      .from("transit_qr_scans")
      .select("*", { count: "exact", head: true })
      .eq("qr_pass_id", passRow.id);

    if (scanCountError) {
      return NextResponse.json(
        {
          ok: false,
          error: scanCountError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      verified,
      status,
      message,
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
        : null,
      readiness,
      documents,
      request: currentRequest
        ? {
            id: currentRequest.id,
            trip_id: currentRequest.trip_id,
            qr_pass_id: currentRequest.qr_pass_id,
            request_status: currentRequest.request_status,
            pass_status: currentRequest.pass_status,
            airport_note: currentRequest.airport_note,
            approved_at: currentRequest.approved_at,
            rejected_at: currentRequest.rejected_at,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Verification failed",
      },
      { status: 500 }
    );
  }
}