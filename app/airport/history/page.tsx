"use client";

import { useEffect, useState } from "react";

type RequestRow = {
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

export default function AirportHistoryPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
        setRequests([]);
        return;
      }

      setRequests(json.requests || []);
    } catch (error) {
      setMessage("Failed to load history.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <section
          style={{
            borderRadius: 28,
            padding: 28,
            background: "linear-gradient(135deg, #111827 0%, #22c55e 100%)",
            color: "#fff",
            marginBottom: 24,
          }}
        >
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
          <p style={{ margin: 0, fontSize: 16, opacity: 0.95 }}>
            Approved and rejected requests are stored here after decision.
          </p>
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
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 900,
              color: "#111827",
            }}
          >
            Stored Requests
          </h2>

          {loading ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading history...</p>
          ) : requests.length === 0 ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>
              No reviewed requests stored yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {requests.map((req) => {
                const approved = req.request_status === "approved";
                const rejected = req.request_status === "rejected";

                return (
                  <div
                    key={req.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      borderRadius: 16,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: "#111827",
                        marginBottom: 8,
                      }}
                    >
                      {req.airport_name || "Stored request"}
                    </div>

                    <div style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.7 }}>
                      <div>Trip ID: {req.trip_id}</div>
                      <div>
                        Request: {req.request_status} • Pass: {req.pass_status}
                      </div>
                      <div>
                        Decision time:{" "}
                        {approved
                          ? req.approved_at
                            ? new Date(req.approved_at).toLocaleString()
                            : "Unknown"
                          : rejected
                          ? req.rejected_at
                            ? new Date(req.rejected_at).toLocaleString()
                            : "Unknown"
                          : req.updated_at
                          ? new Date(req.updated_at).toLocaleString()
                          : "Unknown"}
                      </div>
                      <div>QR Pass ID: {req.qr_pass_id || "Not linked"}</div>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "inline-block",
                        padding: "8px 12px",
                        borderRadius: 999,
                        fontWeight: 900,
                        background: approved ? "#dcfce7" : "#fee2e2",
                        color: approved ? "#166534" : "#991b1b",
                      }}
                    >
                      {approved ? "APPROVED STORED" : "REJECTED STORED"}
                    </div>

                    {req.airport_note ? (
                      <div
                        style={{
                          marginTop: 12,
                          color: "#374151",
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        Note: {req.airport_note}
                      </div>
                    ) : null}
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