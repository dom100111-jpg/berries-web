import React from "react";
import { supabase } from "@/lib/supabase";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

type Trip = {
  title: string | null;
  departure_city: string | null;
  destination_city: string | null;
  airline: string | null;
  flight_number: string | null;
  hotel_name: string | null;
};

type TransitDocument = {
  id: string;
  trip_id?: string | null;
  document_type: string | null;
  file_name: string | null;
  verified: boolean | null;
};

type PassRow = {
  id: string;
  trip_id: string | null;
  qr_code_value: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  expires_at: string | null;
  trip?: Trip | Trip[] | null;
};

function normalizeToken(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();

  if (trimmed.includes("/transit/pass/")) {
    const part = trimmed.split("/transit/pass/")[1] ?? "";
    return part.split("?")[0].split("#")[0].trim() || null;
  }

  return trimmed;
}

function getSafeTrip(passRow: PassRow | null): Trip | null {
  if (!passRow?.trip) return null;
  if (Array.isArray(passRow.trip)) return passRow.trip[0] ?? null;
  return passRow.trip;
}

export default async function TransitPassPage({
  params,
  searchParams,
}: PageProps) {
  const { token: rawToken } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isAirportMode = resolvedSearchParams?.mode === "airport";

  const token = normalizeToken(rawToken);

  if (!token) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>
          <div style={invalidCardStyle}>
            <div style={topRowStyle}>
              <div>
                <div style={brandStyle}>BERRIES TRANSIT</div>
                <h1 style={titleStyle}>Transit Pass Not Found</h1>
              </div>

              <a href={isAirportMode ? "/scan" : "/"} style={closeButtonStyle}>
                ✕
              </a>
            </div>

            <p style={subtitleStyle}>
              This QR pass is invalid, expired, or no longer active.
            </p>

            <div style={badBadgeStyle}>INVALID PASS</div>
          </div>
        </div>
      </main>
    );
  }

  const { data: passRowRaw, error: passError } = await supabase
    .from("transit_qr_passes")
    .select(`
      id,
      trip_id,
      qr_code_value,
      is_active,
      created_at,
      updated_at,
      expires_at,
      trip:transit_trips (
        title,
        departure_city,
        destination_city,
        airline,
        flight_number,
        hotel_name
      )
    `)
    .eq("qr_code_value", token)
    .single();

  const passRow = (passRowRaw ?? null) as PassRow | null;

  const isExpired =
    !!passRow?.expires_at &&
    new Date(passRow.expires_at).getTime() < Date.now();

  if (passError || !passRow || isExpired) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>
          <div style={invalidCardStyle}>
            <div style={topRowStyle}>
              <div>
                <div style={brandStyle}>BERRIES TRANSIT</div>
                <h1 style={titleStyle}>Transit Pass Not Found</h1>
              </div>

              <a href={isAirportMode ? "/scan" : "/"} style={closeButtonStyle}>
                ✕
              </a>
            </div>

            <p style={subtitleStyle}>
              This QR pass is invalid, expired, or no longer active.
            </p>

            <div style={badBadgeStyle}>INVALID PASS</div>
          </div>
        </div>
      </main>
    );
  }

  const scanMode = isAirportMode ? "airport" : "general";

  await supabase.from("transit_qr_scans").insert({
    qr_pass_id: passRow.id,
    token,
    scan_mode: scanMode,
    note: isAirportMode
      ? "Transit pass opened from airport scanner mode"
      : "Transit pass opened from QR verification page",
  });

  const { count: scanCount } = await supabase
    .from("transit_qr_scans")
    .select("*", { count: "exact", head: true })
    .eq("qr_pass_id", passRow.id);

  const safeTrip = getSafeTrip(passRow);

  const docsRes = await supabase
    .from("transit_documents")
    .select("id, document_type, file_name, verified, trip_id")
    .eq("trip_id", String(passRow.trip_id))
    .order("created_at", { ascending: false });

  const documents = (docsRes.data ?? []) as TransitDocument[];

  console.log("PASS ROW:", passRow);
  console.log("SAFE TRIP:", safeTrip);
  console.log("DOCS LOOKUP RESULT:", docsRes.data);

  const hasVerifiedType = (type: string) =>
    documents.some(
      (doc) =>
        (doc.document_type ?? "").toLowerCase() === type &&
        doc.verified === true
    );

  const hasAnyType = (type: string) =>
    documents.some((doc) => (doc.document_type ?? "").toLowerCase() === type);

  const readiness = {
    passport: hasVerifiedType("passport"),
    visa: hasVerifiedType("visa"),
    ticket: hasVerifiedType("ticket"),
    hotel_booking: hasVerifiedType("hotel_booking"),
    vaccination: hasVerifiedType("vaccination"),
  };

  const presence = {
    passport: hasAnyType("passport"),
    visa: hasAnyType("visa"),
    ticket: hasAnyType("ticket"),
    hotel_booking: hasAnyType("hotel_booking"),
    vaccination: hasAnyType("vaccination"),
  };

  const hasMinimumVerified =
    readiness.passport &&
    readiness.ticket &&
    readiness.hotel_booking;

  const hasMinimumUploaded =
    presence.passport &&
    presence.ticket &&
    presence.hotel_booking;

  const overallStatus: "GREEN" | "RED" | "REVIEW" = isExpired
    ? "RED"
    : hasMinimumVerified
    ? "GREEN"
    : hasMinimumUploaded
    ? "REVIEW"
    : "RED";

  const statusTitle =
    overallStatus === "GREEN"
      ? "CLEARED FOR TRAVEL"
      : overallStatus === "RED"
      ? "ENTRY DENIED"
      : "MANUAL REVIEW REQUIRED";

  const headerTitle =
    overallStatus === "GREEN"
      ? "Transit Pass Verified"
      : overallStatus === "RED"
      ? "Transit Pass Rejected"
      : "Transit Pass Pending Review";

  const statusSubtitle =
    overallStatus === "GREEN"
      ? "Passenger meets travel requirements."
      : overallStatus === "RED"
      ? "Critical travel documents are missing."
      : "Documents require officer verification.";

  const heroBadgeStyle =
    overallStatus === "GREEN"
      ? goodBadgeStyle
      : overallStatus === "RED"
      ? redBadgeStyle
      : warnBadgeStyle;

  const summaryStyle =
    overallStatus === "GREEN"
      ? summaryGoodStyle
      : overallStatus === "RED"
      ? summaryBadStyle
      : summaryWarnStyle;

  return (
    <main style={pageStyle}>
      <div style={{ ...shellStyle, maxWidth: isAirportMode ? 1200 : 920 }}>
        <div style={cardStyle}>
          <div style={heroStyle}>
            <div style={topRowStyle}>
              <div>
                <div style={brandStyle}>
                  {isAirportMode ? "BERRIES AIRPORT MODE" : "BERRIES TRANSIT"}
                </div>
                <h1 style={heroTitleStyle}>
                  {isAirportMode ? "Transit Verification" : headerTitle}
                </h1>
                <p style={heroSubtitleStyle}>{statusSubtitle}</p>
              </div>

              <a href={isAirportMode ? "/scan" : "/"} style={closeButtonStyle}>
                ✕
              </a>
            </div>

            <div
              style={{
                ...heroBadgeStyle,
                fontSize: 16,
                padding: "14px 22px",
                letterSpacing: 1,
              }}
            >
              {overallStatus === "GREEN" && "🟢 "}
              {overallStatus === "REVIEW" && "🟡 "}
              {overallStatus === "RED" && "🔴 "}
              {statusTitle}
            </div>
          </div>

          <section style={sectionStyle}>
            <div style={summaryStyle}>
              <div style={summaryTitleStyle}>{statusTitle}</div>
              <div style={summaryTextStyle}>{statusSubtitle}</div>
            </div>
          </section>

          <div style={gridStyle}>
            <section style={sectionCardStyle}>
              <div style={sectionLabelStyle}>Route</div>
              <div style={routeStyle}>
                <span>{safeTrip?.departure_city || "Unknown"}</span>
                <span style={arrowStyle}>→</span>
                <span>{safeTrip?.destination_city || "Unknown"}</span>
              </div>
              <div style={mutedStyle}>{safeTrip?.title || "Untitled trip"}</div>
            </section>

            <section style={sectionCardStyle}>
              <div style={sectionLabelStyle}>Flight</div>
              <div style={primaryTextStyle}>
                {[safeTrip?.airline, safeTrip?.flight_number]
                  .filter(Boolean)
                  .join(" • ") || "Not added"}
              </div>
              <div style={mutedStyle}>
                Hotel: {safeTrip?.hotel_name || "Not added"}
              </div>
            </section>
          </div>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>Travel readiness</div>

            <div style={checklistGridStyle}>
              <ChecklistItem label="Passport" ok={readiness.passport} />
              <ChecklistItem label="Visa" ok={readiness.visa} />
              <ChecklistItem label="Ticket" ok={readiness.ticket} />
              <ChecklistItem label="Hotel booking" ok={readiness.hotel_booking} />
              <ChecklistItem label="Vaccination" ok={readiness.vaccination} />
            </div>
          </section>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>Documents linked to this trip</div>

            {documents.length === 0 ? (
              <p style={mutedStyle}>No documents uploaded for this trip yet.</p>
            ) : (
              <div style={docListStyle}>
                {documents.map((doc) => (
                  <div key={doc.id} style={docCardStyle}>
                    <div>
                      <div style={docTypeStyle}>
                        {(doc.document_type ?? "document").replace("_", " ")}
                      </div>
                      <div style={docNameStyle}>
                        {doc.file_name ?? "Unnamed file"}
                      </div>
                    </div>

                    <div
                      style={doc.verified ? verifiedPillStyle : pendingPillStyle}
                    >
                      {doc.verified ? "Verified" : "Pending"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={footerStyle}>
            <div style={tokenBoxStyle}>
              <div style={tokenLabelStyle}>PASS TOKEN</div>
              <div style={tokenValueStyle}>{token}</div>

              <div style={tokenMetaRowStyle}>
                <div style={tokenMetaItemStyle}>
                  Expires:{" "}
                  {passRow.expires_at
                    ? new Date(passRow.expires_at).toLocaleString()
                    : "Not set"}
                </div>

                <div style={tokenMetaItemStyle}>
                  Total scans: {scanCount ?? 0}
                </div>

                <div style={tokenMetaItemStyle}>
                  Mode: {isAirportMode ? "Airport scanner" : "Passenger view"}
                </div>

                <div style={tokenMetaItemStyle}>Status: {overallStatus}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ChecklistItem({
  label,
  ok,
}: {
  label: string;
  ok: boolean;
}) {
  return (
    <div style={checkItemStyle(ok)}>
      <span style={checkIconStyle}>{ok ? "✔" : "✕"}</span>
      <span>{label}</span>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #0f172a 0%, #111827 42%, #0b1220 100%)",
  padding: "32px 16px",
};

const shellStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 920,
  margin: "0 auto",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 28,
  overflow: "hidden",
  border: "1px solid rgba(229,231,235,0.9)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
};

const invalidCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 28,
  padding: 28,
  border: "1px solid rgba(229,231,235,0.9)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
};

const heroStyle: React.CSSProperties = {
  padding: 28,
  background: "linear-gradient(135deg, #052e16 0%, #166534 55%, #22c55e 100%)",
  color: "#ffffff",
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
};

const brandStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1.6,
  opacity: 0.9,
};

const heroTitleStyle: React.CSSProperties = {
  margin: "10px 0 8px",
  fontSize: 36,
  lineHeight: 1.05,
  fontWeight: 900,
};

const titleStyle: React.CSSProperties = {
  margin: "10px 0 8px",
  fontSize: 34,
  lineHeight: 1.05,
  fontWeight: 900,
  color: "#111827",
};

const heroSubtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.6,
  opacity: 0.95,
};

const subtitleStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 15,
  lineHeight: 1.6,
  color: "#4b5563",
};

const closeButtonStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  fontWeight: 900,
  fontSize: 18,
  color: "#111827",
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(255,255,255,0.6)",
};

const goodBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 20,
  background: "rgba(255,255,255,0.16)",
  color: "#ffffff",
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: 999,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 0.4,
};

const warnBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 20,
  background: "rgba(255,255,255,0.14)",
  color: "#fef3c7",
  border: "1px solid rgba(254,243,199,0.35)",
  borderRadius: 999,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 0.4,
};

const redBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 20,
  background: "rgba(254,226,226,0.16)",
  color: "#fecaca",
  border: "1px solid rgba(254,202,202,0.45)",
  borderRadius: 999,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 0.4,
};

const badBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: 999,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 0.4,
};

const summaryGoodStyle: React.CSSProperties = {
  borderRadius: 18,
  background: "#ecfdf5",
  border: "1px solid #86efac",
  padding: 18,
  color: "#166534",
};

const summaryWarnStyle: React.CSSProperties = {
  borderRadius: 18,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  padding: 18,
  color: "#9a3412",
};

const summaryBadStyle: React.CSSProperties = {
  borderRadius: 18,
  background: "#fef2f2",
  border: "1px solid #fca5a5",
  padding: 18,
  color: "#991b1b",
};

const summaryTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
};

const summaryTextStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  lineHeight: 1.6,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
  padding: 24,
};

const sectionCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 20,
  background: "#f9fafb",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1,
  color: "#6b7280",
  textTransform: "uppercase",
  marginBottom: 10,
};

const routeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 24,
  fontWeight: 900,
  color: "#111827",
  flexWrap: "wrap",
};

const arrowStyle: React.CSSProperties = {
  color: "#22c55e",
};

const primaryTextStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: "#111827",
  lineHeight: 1.25,
};

const mutedStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#6b7280",
  lineHeight: 1.6,
};

const sectionStyle: React.CSSProperties = {
  padding: "0 24px 24px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: "#111827",
  marginBottom: 14,
};

const checklistGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const checkItemStyle = (ok: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "14px 16px",
  borderRadius: 16,
  border: `1px solid ${ok ? "#bbf7d0" : "#fed7aa"}`,
  background: ok ? "#f0fdf4" : "#fff7ed",
  color: ok ? "#166534" : "#9a3412",
  fontWeight: 800,
});

const checkIconStyle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 16,
};

const docListStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const docCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  background: "#ffffff",
};

const docTypeStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  color: "#111827",
  textTransform: "capitalize",
};

const docNameStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#6b7280",
};

const verifiedPillStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 900,
};

const pendingPillStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  background: "#fff7ed",
  color: "#b45309",
  border: "1px solid #fdba74",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 900,
};

const footerStyle: React.CSSProperties = {
  padding: "0 24px 24px",
};

const tokenBoxStyle: React.CSSProperties = {
  borderRadius: 20,
  background: "#111827",
  color: "#ffffff",
  padding: 18,
};

const tokenLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1,
  opacity: 0.7,
};

const tokenValueStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 16,
  lineHeight: 1.5,
  fontWeight: 800,
  wordBreak: "break-word",
};

const tokenMetaRowStyle: React.CSSProperties = {
  marginTop: 12,
  display: "grid",
  gap: 8,
};

const tokenMetaItemStyle: React.CSSProperties = {
  color: "#d1d5db",
  fontSize: 13,
  lineHeight: 1.5,
};