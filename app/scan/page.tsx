"use client";

import React, { useMemo, useState } from "react";

type VerifyResponse = {
  ok: boolean;
  verified?: boolean;
  status?: string;
  message?: string;
  token?: string;
  total_scans?: number;
  pass?: {
    id: string;
    is_active: boolean;
    created_at: string;
    expires_at?: string | null;
  };
  trip?: {
    title: string;
    departure_city: string;
    destination_city: string;
    airline?: string | null;
    flight_number?: string | null;
    hotel_name?: string | null;
  };
  readiness?: {
    passport: boolean;
    visa: boolean;
    ticket: boolean;
    hotel_booking: boolean;
    vaccination: boolean;
  };
  documents?: Array<{
    id: string;
    document_type: string | null;
    file_name: string | null;
    verified: boolean | null;
  }>;
  error?: string;
};

export default function ScanPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);

  const badgeText = useMemo(() => {
    if (!result) return "READY TO SCAN";
    if (result.verified) return "VERIFIED";
    return result.status ?? "REJECTED";
  }, [result]);

  const badgeStyle = useMemo(() => {
    if (!result) return statusNeutralStyle;
    return result.verified ? statusGoodStyle : statusBadStyle;
  }, [result]);

  const verifyNow = async () => {
    try {
      setLoading(true);
      setResult(null);

      const res = await fetch("/api/scan/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          scan_mode: "airport",
          verifier_type: "airport_staff",
        }),
      });

      const json = (await res.json()) as VerifyResponse;
      setResult(json);
    } catch (error: any) {
      setResult({
        ok: false,
        error: error?.message ?? "Verification failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <section style={heroStyle}>
          <div style={heroTopRowStyle}>
            <div>
              <div style={eyebrowStyle}>BERRIES AIRPORT MODE</div>
              <h1 style={heroTitleStyle}>Live Transit Scanner</h1>
              <p style={heroTextStyle}>
                Verify passenger travel readiness from QR token or scanned URL.
              </p>
            </div>

            <div style={badgeStyle}>{badgeText}</div>
          </div>
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}>Scan Input</h2>

          <div style={inputRowStyle}>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token or full transit pass URL"
              style={inputStyle}
            />
            <button
              onClick={verifyNow}
              disabled={loading || !token.trim()}
              style={{
                ...buttonStyle,
                opacity: loading || !token.trim() ? 0.7 : 1,
                cursor: loading || !token.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Verifying..." : "Verify Pass"}
            </button>
          </div>

          <p style={hintStyle}>
            Example: berries-transit-1773675828035-pk8g79g0
          </p>
        </section>

        {result ? (
          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>Verification Result</h2>

            {!result.ok ? (
              <div style={errorBoxStyle}>
                {result.error || "Something went wrong."}
              </div>
            ) : (
              <>
                <div
                  style={
                    result.verified ? verifiedBannerStyle : rejectedBannerStyle
                  }
                >
                  <div style={{ fontSize: 24, fontWeight: 900 }}>
                    {result.verified ? "PASS VERIFIED" : "PASS REQUIRES REVIEW"}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 16 }}>
                    {result.message}
                  </div>
                </div>

                <div style={gridStyle}>
                  <div style={cardStyle}>
                    <div style={cardLabelStyle}>Route</div>
                    <div style={cardMainStyle}>
                      {result.trip?.departure_city ?? "Unknown"} →{" "}
                      {result.trip?.destination_city ?? "Unknown"}
                    </div>
                    <div style={cardSubStyle}>
                      {result.trip?.title ?? "Untitled trip"}
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <div style={cardLabelStyle}>Flight</div>
                    <div style={cardMainStyle}>
                      {[result.trip?.airline, result.trip?.flight_number]
                        .filter(Boolean)
                        .join(" • ") || "Not added"}
                    </div>
                    <div style={cardSubStyle}>
                      Hotel: {result.trip?.hotel_name || "Not added"}
                    </div>
                  </div>
                </div>

                <div style={gridStyle}>
                  <div style={cardStyle}>
                    <div style={cardLabelStyle}>Pass Token</div>
                    <div style={tokenStyle}>{result.token}</div>
                    <div style={cardSubStyle}>
                      Total scans: {result.total_scans ?? 0}
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <div style={cardLabelStyle}>Pass Status</div>
                    <div style={cardMainStyle}>
                      {result.pass?.is_active ? "Active" : "Inactive"}
                    </div>
                    <div style={cardSubStyle}>
                      Expires:{" "}
                      {result.pass?.expires_at
                        ? new Date(result.pass.expires_at).toLocaleString()
                        : "Not set"}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 24 }}>
                  <h3 style={subTitleStyle}>Travel Readiness</h3>

                  <div style={checkGridStyle}>
                    <CheckItem
                      label="Passport"
                      ok={!!result.readiness?.passport}
                    />
                    <CheckItem label="Visa" ok={!!result.readiness?.visa} />
                    <CheckItem label="Ticket" ok={!!result.readiness?.ticket} />
                    <CheckItem
                      label="Hotel booking"
                      ok={!!result.readiness?.hotel_booking}
                    />
                    <CheckItem
                      label="Vaccination"
                      ok={!!result.readiness?.vaccination}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 24 }}>
                  <h3 style={subTitleStyle}>Linked Documents</h3>

                  {!result.documents || result.documents.length === 0 ? (
                    <div style={emptyStyle}>No linked documents found.</div>
                  ) : (
                    <div style={docListStyle}>
                      {result.documents.map((doc) => (
                        <div key={doc.id} style={docCardStyle}>
                          <div style={docTitleStyle}>
                            {(doc.document_type ?? "document").replace("_", " ")}
                          </div>
                          <div style={docFileStyle}>
                            {doc.file_name ?? "Unnamed file"}
                          </div>
                          <div
                            style={{
                              ...docVerifyStyle,
                              color: doc.verified ? "#166534" : "#b45309",
                            }}
                          >
                            {doc.verified ? "Verified" : "Pending verification"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function CheckItem({
  label,
  ok,
}: {
  label: string;
  ok: boolean;
}) {
  return (
    <div
      style={{
        ...checkItemStyle,
        borderColor: ok ? "#86efac" : "#fcd34d",
        background: ok ? "#f0fdf4" : "#fffbeb",
        color: ok ? "#166534" : "#92400e",
      }}
    >
      <span>{ok ? "✔" : "✖"}</span>
      <span>{label}</span>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #06122b 0%, #081634 20%, #f8fafc 20%, #f8fafc 100%)",
  padding: "32px 16px 60px",
};

const shellStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1200,
  margin: "0 auto",
};

const heroStyle: React.CSSProperties = {
  borderRadius: 28,
  padding: 28,
  background: "linear-gradient(135deg, #0b1220 0%, #22c55e 100%)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
};

const heroTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 2,
  opacity: 0.9,
};

const heroTitleStyle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 42,
  lineHeight: 1.05,
  fontWeight: 900,
};

const heroTextStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 17,
  lineHeight: 1.6,
  opacity: 0.95,
  maxWidth: 720,
};

const statusNeutralStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 18px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.35)",
  background: "rgba(255,255,255,0.12)",
  fontWeight: 900,
  fontSize: 13,
  letterSpacing: 1,
};

const statusGoodStyle: React.CSSProperties = {
  ...statusNeutralStyle,
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
};

const statusBadStyle: React.CSSProperties = {
  ...statusNeutralStyle,
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
};

const panelStyle: React.CSSProperties = {
  marginTop: 24,
  borderRadius: 24,
  background: "#fff",
  border: "1px solid #e5e7eb",
  padding: 24,
  boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 900,
  color: "#111827",
};

const inputRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginTop: 18,
  flexWrap: "wrap",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 260,
  height: 54,
  borderRadius: 16,
  border: "1px solid #d1d5db",
  padding: "0 16px",
  fontSize: 15,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  height: 54,
  borderRadius: 16,
  border: "none",
  background: "#22c55e",
  color: "#052e16",
  fontWeight: 900,
  padding: "0 20px",
  fontSize: 15,
};

const hintStyle: React.CSSProperties = {
  marginTop: 10,
  color: "#6b7280",
  fontSize: 13,
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 16,
  borderRadius: 16,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  fontWeight: 700,
};

const verifiedBannerStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 20,
  borderRadius: 20,
  background: "#ecfdf5",
  border: "1px solid #86efac",
  color: "#166534",
};

const rejectedBannerStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 20,
  borderRadius: 20,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
  marginTop: 18,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  padding: 18,
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1.5,
  color: "#6b7280",
  textTransform: "uppercase",
};

const cardMainStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 24,
  fontWeight: 900,
  color: "#111827",
  lineHeight: 1.2,
};

const cardSubStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  color: "#6b7280",
  lineHeight: 1.5,
};

const subTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 900,
  color: "#111827",
};

const checkGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginTop: 14,
};

const checkItemStyle: React.CSSProperties = {
  padding: "16px 18px",
  borderRadius: 16,
  border: "1px solid",
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 800,
  fontSize: 16,
};

const docListStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 14,
};

const docCardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  padding: 16,
};

const docTitleStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#111827",
  textTransform: "capitalize",
};

const docFileStyle: React.CSSProperties = {
  marginTop: 6,
  color: "#6b7280",
  fontSize: 14,
};

const docVerifyStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  fontWeight: 800,
};

const emptyStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 16,
  borderRadius: 14,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  color: "#6b7280",
};

const tokenStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 18,
  fontWeight: 900,
  color: "#111827",
  wordBreak: "break-word",
};