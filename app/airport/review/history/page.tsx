"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type HistoryRow = {
  id: string;
  trip_id: string;
  airport_name: string | null;
  request_status: string;
  pass_status: string;
  airport_note: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  updated_at: string | null;
  qr_pass_id: string | null;
};

export default function AirportReviewHistoryPage() {
  const [items, setItems] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/airport/review/history", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setMessage(json.error || "Failed to load history.");
        setItems([]);
        return;
      }

      setItems(json.requests || []);
    } catch (error) {
      setMessage("Failed to load history.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      return (
        item.id.toLowerCase().includes(q) ||
        item.trip_id.toLowerCase().includes(q) ||
        (item.airport_name || "").toLowerCase().includes(q) ||
        item.request_status.toLowerCase().includes(q) ||
        item.pass_status.toLowerCase().includes(q) ||
        (item.airport_note || "").toLowerCase().includes(q) ||
        (item.qr_pass_id || "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  return (
    <main
      style={{
        padding: 24,
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <section
          style={{
            borderRadius: 28,
            padding: 28,
            background: "linear-gradient(135deg, #111827 0%, #2563eb 100%)",
            color: "#fff",
            marginBottom: 24,
            boxShadow: "0 20px 60px rgba(37,99,235,0.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.8 }}>
                BERRIES AIRPORT HISTORY
              </div>

              <h1
                style={{
                  margin: "10px 0 8px",
                  fontSize: 34,
                  fontWeight: 900,
                }}
              >
                Review Storage
              </h1>

              <p style={{ margin: 0, fontSize: 16, opacity: 0.95, maxWidth: 760 }}>
                Approved and rejected requests are stored here after decision.
                Search by trip ID, QR pass ID, airport, or status.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
                position: "relative",
              }}
            >
              <Link
                href="/airport/review"
                style={{
                  textDecoration: "none",
                  background: "#ffffff",
                  color: "#111827",
                  padding: "12px 16px",
                  borderRadius: 14,
                  fontWeight: 900,
                  border: "1px solid rgba(255,255,255,0.6)",
                }}
              >
                ← Back to Review
              </Link>

              <button
                onClick={loadHistory}
                style={{
                  background: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  padding: "12px 16px",
                  borderRadius: 14,
                  fontWeight: 900,
                  border: "1px solid rgba(255,255,255,0.25)",
                  cursor: "pointer",
                }}
              >
                Refresh
              </button>

              <button
                onClick={() => setShowMenu((prev) => !prev)}
                style={{
                  background: "#ffffff",
                  color: "#111827",
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  fontWeight: 900,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                ⋮
              </button>

              {showMenu ? (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 56,
                    minWidth: 220,
                    borderRadius: 14,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 20px 40px rgba(15,23,42,0.15)",
                    overflow: "hidden",
                    zIndex: 30,
                  }}
                >
                  <Link
                    href="/airport/review"
                    style={{
                      display: "block",
                      padding: "12px 14px",
                      color: "#111827",
                      textDecoration: "none",
                      fontWeight: 800,
                      borderBottom: "1px solid #f1f5f9",
                    }}
                    onClick={() => setShowMenu(false)}
                  >
                    Transit Review Dashboard
                  </Link>

                  <Link
                    href="/scan"
                    style={{
                      display: "block",
                      padding: "12px 14px",
                      color: "#111827",
                      textDecoration: "none",
                      fontWeight: 800,
                    }}
                    onClick={() => setShowMenu(false)}
                  >
                    Live Transit Scanner
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {message ? (
          <div
            style={{
              marginBottom: 16,
              borderRadius: 16,
              padding: 14,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        ) : null}

        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                Stored Decisions
              </h2>

              <div
                style={{
                  marginTop: 6,
                  color: "#6b7280",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {loading
                  ? "Loading..."
                  : `${filteredItems.length} result${
                      filteredItems.length === 1 ? "" : "s"
                    } found`}
              </div>
            </div>

            <div style={{ minWidth: 280, flex: 1, maxWidth: 420 }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by trip ID, QR pass ID, airport, note..."
                style={{
                  width: "100%",
                  height: 50,
                  borderRadius: 14,
                  border: "1px solid #d1d5db",
                  padding: "0 16px",
                  fontSize: 15,
                  outline: "none",
                  background: "#fff",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <Link
              href="/airport/review"
              style={{
                textDecoration: "none",
                background: "#111827",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 800,
              }}
            >
              Review Dashboard
            </Link>

            <Link
              href="/scan"
              style={{
                textDecoration: "none",
                background: "#2563eb",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 800,
              }}
            >
              Live Scanner
            </Link>
          </div>

          {loading ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading history...</p>
          ) : filteredItems.length === 0 ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>
              {items.length === 0
                ? "No approved or rejected requests yet."
                : "No history matched your search."}
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 16,
                marginTop: 8,
              }}
            >
              {filteredItems.map((item) => {
                const approved = item.request_status === "approved";
                const decisionTime =
                  item.updated_at ||
                  item.approved_at ||
                  item.rejected_at ||
                  null;

                return (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      borderRadius: 18,
                      padding: 18,
                      boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            color: "#111827",
                            lineHeight: 1.25,
                          }}
                        >
                          {item.airport_name || "Airport request"}
                        </div>

                        <div
                          style={{
                            color: "#6b7280",
                            fontSize: 13,
                            marginTop: 4,
                            wordBreak: "break-word",
                          }}
                        >
                          Trip ID: {item.trip_id}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "inline-block",
                          padding: "8px 12px",
                          borderRadius: 999,
                          fontWeight: 900,
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          background: approved ? "#dcfce7" : "#fee2e2",
                          color: approved ? "#166534" : "#991b1b",
                        }}
                      >
                        {approved ? "APPROVED" : "REJECTED"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        color: "#374151",
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      <div>
                        <strong>Request:</strong> {item.request_status}
                      </div>

                      <div>
                        <strong>Pass:</strong> {item.pass_status}
                      </div>

                      <div>
                        <strong>Decision time:</strong>{" "}
                        {decisionTime
                          ? new Date(decisionTime).toLocaleString()
                          : "Unknown"}
                      </div>

                      {item.qr_pass_id ? (
                        <div style={{ wordBreak: "break-word" }}>
                          <strong>QR Pass ID:</strong> {item.qr_pass_id}
                        </div>
                      ) : null}

                      {item.airport_note ? (
                        <div
                          style={{
                            marginTop: 4,
                            padding: 12,
                            borderRadius: 12,
                            background: approved ? "#f0fdf4" : "#fef2f2",
                            border: approved
                              ? "1px solid #bbf7d0"
                              : "1px solid #fecaca",
                            color: approved ? "#166534" : "#991b1b",
                          }}
                        >
                          <strong>Note:</strong> {item.airport_note}
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        color: "#6b7280",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <span>ID: {item.id.slice(0, 8)}...</span>
                      <span>
                        {approved
                          ? "Stored approved decision"
                          : "Stored rejected decision"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}