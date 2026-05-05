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
  } | null;
  trip?: {
    title: string;
    departure_city: string;
    destination_city: string;
    airline?: string | null;
    flight_number?: string | null;
    hotel_name?: string | null;
  } | null;
  readiness?: {
    passport: boolean;
    visa: boolean;
    ticket: boolean;
    hotel_booking: boolean;
    vaccination: boolean;
  };
  request?: {
    id: string;
    trip_id: string | null;
    qr_pass_id: string | null;
    request_status: string | null;
    pass_status: string | null;
    airport_note: string | null;
    approved_at: string | null;
    rejected_at: string | null;
  } | null;
  error?: string;
};

function normalizeToken(value: string) {
  const trimmed = value.trim();

  if (trimmed.includes("/transit/pass/")) {
    const part = trimmed.split("/transit/pass/")[1] ?? "";
    return part.split("?")[0].split("#")[0].trim();
  }

  return trimmed;
}

export default function ScanPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const statusLabel = useMemo(() => {
    if (!result) return "READY";
    if (!result.ok) return "ERROR";
    if (result.verified) return "CLEARED";
    return result.status ?? "HOLD";
  }, [result]);

  const statusPillStyle = useMemo(() => {
    if (!result) return readyPillStyle;
    if (!result.ok) return errorPillStyle;
    if (result.verified) return successPillStyle;
    return holdPillStyle;
  }, [result]);

  const resultBannerStyle = useMemo(() => {
    if (!result) return neutralBannerStyle;
    if (!result.ok) return errorBannerStyle;
    if (result.verified) return successBannerStyle;
    return holdBannerStyle;
  }, [result]);

  async function scanNow() {
    try {
      setLoading(true);
      setResult(null);

      const cleaned = normalizeToken(token);

      const res = await fetch("/api/scan/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: cleaned,
          scan_mode: "airport",
          verifier_type: "airport_scanner",
        }),
      });

      const json = (await res.json()) as VerifyResponse;
      setResult(json);
    } catch (error: any) {
      setResult({
        ok: false,
        error: error?.message ?? "Scan failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <section style={heroStyle}>
          <div style={heroRowStyle}>
            <div>
              <div style={eyebrowStyle}>BERRIES AIRPORT MODE</div>
              <h1 style={heroTitleStyle}>Live Transit Scanner</h1>
              <p style={heroTextStyle}>
                Scanner reads the final airport QR and immediately checks if the
                passenger is cleared for boarding.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={statusPillStyle}>{statusLabel}</div>

              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowMenu((prev) => !prev)}
                  style={menuButtonStyle}
                >
                  ⋮
                </button>

                {showMenu ? (
                  <div style={menuDropdownStyle}>
                    <a
                      href="/airport/review"
                      style={menuItemStyle}
                      onClick={() => setShowMenu(false)}
                    >
                      Transit Review Dashboard
                    </a>

                    <a
                      href="/airport/review/history"
                      style={menuItemStyle}
                      onClick={() => setShowMenu(false)}
                    >
                      Review Storage
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}>Scan Input</h2>

          <div style={inputRowStyle}>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste airport-result token or full transit pass URL"
              style={inputStyle}
            />

            <button
              onClick={scanNow}
              disabled={loading || !token.trim()}
              style={{
                ...buttonStyle,
                opacity: loading || !token.trim() ? 0.7 : 1,
                cursor: loading || !token.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Scanning..." : "Scan Now"}
            </button>
          </div>

          <p style={hintStyle}>
            Scanner reads the token and connects it directly to the stored transit
            pass.
          </p>
        </section>

        {result ? (
          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>Scan Result</h2>

            {!result.ok ? (
              <div style={errorBannerStyle}>
                <div style={bannerTitleStyle}>SCAN ERROR</div>
                <div style={bannerTextStyle}>
                  {result.error || "Something went wrong."}
                </div>
              </div>
            ) : (
              <>
                <div style={resultBannerStyle}>
                  <div style={bannerTitleStyle}>
                    {result.verified ? "PASS CLEARED" : "HOLD FOR OFFICER"}
                  </div>
                  <div style={bannerTextStyle}>
                    {result.message || "No result message."}
                  </div>

                  {!result.verified ? (
                    <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <a href="/airport/review" style={quickLinkButtonStyle}>
                        Open Transit Review Dashboard
                      </a>
                      <a href="/airport/review/history" style={quickLinkButtonStyle}>
                        Open Review Storage
                      </a>
                    </div>
                  ) : null}
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
                      Total scans: {result.total_scans ?? 0}
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <div style={cardLabelStyle}>Pass Token</div>
                    <div style={tokenStyle}>{result.token ?? "No token"}</div>
                  </div>

                  <div style={cardStyle}>
                    <div style={cardLabelStyle}>Pass State</div>
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
                  <h3 style={subTitleStyle}>Boarding Checks</h3>

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

                {result.request ? (
                  <div style={{ marginTop: 24 }}>
                    <h3 style={subTitleStyle}>Airport Decision</h3>

                    <div style={decisionCardStyle}>
                      <div style={decisionRowStyle}>
                        <span style={decisionLabelStyle}>Request status</span>
                        <span style={decisionValueStyle}>
                          {result.request.request_status ?? "Unknown"}
                        </span>
                      </div>

                      <div style={decisionRowStyle}>
                        <span style={decisionLabelStyle}>Pass status</span>
                        <span style={decisionValueStyle}>
                          {result.request.pass_status ?? "Unknown"}
                        </span>
                      </div>

                      {result.request.airport_note ? (
                        <div style={{ ...decisionRowStyle, alignItems: "flex-start" }}>
                          <span style={decisionLabelStyle}>Airport note</span>
                          <span style={decisionValueStyle}>
                            {result.request.airport_note}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
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
        borderColor: ok ? "#86efac" : "#fdba74",
        background: ok ? "#f0fdf4" : "#fff7ed",
        color: ok ? "#166534" : "#9a3412",
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

const heroRowStyle: React.CSSProperties = {
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
  maxWidth: 760,
};

const readyPillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 18px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.35)",
  background: "rgba(255,255,255,0.12)",
  fontWeight: 900,
  fontSize: 13,
  letterSpacing: 1,
};

const successPillStyle: React.CSSProperties = {
  ...readyPillStyle,
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
};

const holdPillStyle: React.CSSProperties = {
  ...readyPillStyle,
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fdba74",
};

const errorPillStyle: React.CSSProperties = {
  ...readyPillStyle,
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
};

const menuButtonStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.28)",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: 22,
  fontWeight: 900,
  cursor: "pointer",
};

const menuDropdownStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: 52,
  minWidth: 230,
  borderRadius: 14,
  background: "#fff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 20px 40px rgba(15,23,42,0.15)",
  overflow: "hidden",
  zIndex: 30,
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "12px 14px",
  color: "#111827",
  textDecoration: "none",
  fontWeight: 800,
  borderBottom: "1px solid #f1f5f9",
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

const neutralBannerStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 20,
  borderRadius: 20,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  color: "#111827",
};

const successBannerStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 20,
  borderRadius: 20,
  background: "#ecfdf5",
  border: "1px solid #86efac",
  color: "#166534",
};

const holdBannerStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 20,
  borderRadius: 20,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
};

const errorBannerStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 20,
  borderRadius: 20,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};

const bannerTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
};

const bannerTextStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 16,
};

const quickLinkButtonStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#fff",
  color: "#111827",
  padding: "10px 14px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 800,
  border: "1px solid rgba(17,24,39,0.08)",
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

const decisionCardStyle: React.CSSProperties = {
  marginTop: 14,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  padding: 16,
};

const decisionRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  padding: "10px 0",
  borderBottom: "1px solid #e5e7eb",
};

const decisionLabelStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#374151",
};

const decisionValueStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#111827",
  textAlign: "right",
};

const tokenStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 18,
  fontWeight: 900,
  color: "#111827",
  wordBreak: "break-word",
};