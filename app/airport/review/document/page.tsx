"use client";

import { useEffect, useState } from "react";

type RequestRow = {
  id: string;
  user_id: string | null;
  trip_id: string;
  qr_pass_id: string | null;
  airport_name: string | null;
  airport_code: string | null;
  intended_travel_date: string | null;
  request_status: string;
  pass_status: string;
  passenger_note: string | null;
  airport_note: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DocumentRow = {
  id: string;
  trip_id: string;
  document_type: string | null;
  file_name: string | null;
  file_url?: string | null;
  verified: boolean | null;
};

type TripRow = {
  id: string;
  title: string | null;
  departure_city: string | null;
  destination_city: string | null;
  airline: string | null;
  flight_number: string | null;
};

export default function AirportReviewPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [trip, setTrip] = useState<TripRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/airport/review/requests", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setMessage(json.error || "Failed to load requests.");
        setRequests([]);
        return;
      }

      setRequests((json.requests ?? []) as RequestRow[]);
    } catch {
      setMessage("Failed to load requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function openRequest(req: RequestRow) {
    try {
      setSelected(req);
      setLoadingDetails(true);
      setMessage("");

      const res = await fetch(
        `/api/airport/review/requests?trip_id=${req.trip_id}`,
        {
          cache: "no-store",
        }
      );

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setMessage(json.error || "Failed to load request details.");
        setDocuments([]);
        setTrip(null);
        return;
      }

      setDocuments((json.documents ?? []) as DocumentRow[]);
      setTrip((json.trip ?? null) as TripRow | null);

      const latestRequest = (json.request ?? req) as RequestRow;
      setSelected(latestRequest);

      if (latestRequest.request_status === "pending_review") {
        await fetch("/api/airport/review/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId: latestRequest.id,
            tripId: latestRequest.trip_id,
            action: "open_under_review",
          }),
        });

        setSelected({
          ...latestRequest,
          request_status: "under_review",
        });

        await loadRequests();
      }
    } catch {
      setMessage("Failed to open request.");
      setDocuments([]);
      setTrip(null);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function toggleVerify(doc: DocumentRow) {
    try {
      setBusy(true);
      setMessage("");

      const res = await fetch("/api/scan/document-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: doc.id,
          status: doc.verified ? "pending" : "verified",
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setMessage(json.error || "Failed to update document.");
        return;
      }

      if (selected) {
        await openRequest(selected);
      }
    } catch {
      setMessage("Failed to update document.");
    } finally {
      setBusy(false);
    }
  }

  async function updateRequest(action: "approve" | "reject") {
    try {
      if (!selected) return;

      setBusy(true);
      setMessage("");

      const res = await fetch("/api/airport/review/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: selected.id,
          tripId: selected.trip_id,
          action,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setMessage(json.error || "Failed to update request.");
        return;
      }

      setMessage(
        action === "approve"
          ? "Pass approved and airport QR generated."
          : "Pass rejected."
      );

      setSelected(null);
      setDocuments([]);
      setTrip(null);

      await loadRequests();
    } catch {
      setMessage("Failed to update request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        padding: 24,
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            borderRadius: 28,
            padding: 28,
            background: "linear-gradient(135deg, #111827 0%, #22c55e 100%)",
            color: "#fff",
            marginBottom: 24,
            position: "sticky",
            top: 12,
            zIndex: 5,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.8 }}>
            BERRIES AIRPORT REVIEW
          </div>
          <h1
            style={{
              margin: "10px 0 8px",
              fontSize: 34,
              fontWeight: 900,
            }}
          >
            Transit Review Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.95 }}>
            Review uploaded travel documents before granting a final transit
            pass.
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

        {!selected ? (
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
              Incoming Requests
            </h2>

            {loading ? (
              <p style={{ color: "#6b7280", marginTop: 12 }}>
                Loading requests...
              </p>
            ) : requests.length === 0 ? (
              <p style={{ color: "#6b7280", marginTop: 12 }}>
                No pending or under-review requests.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginTop: 16,
                  maxHeight: "58vh",
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {requests.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => openRequest(req)}
                    style={{
                      textAlign: "left",
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      borderRadius: 16,
                      padding: 16,
                      cursor: "pointer",
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
                      {req.airport_name || "Airport request"}
                    </div>

                    <div
                      style={{
                        color: "#6b7280",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      <div>Trip ID: {req.trip_id}</div>
                      <div>
                        Request: {req.request_status} • Pass: {req.pass_status}
                      </div>
                      <div>
                        Created:{" "}
                        {req.created_at
                          ? new Date(req.created_at).toLocaleString()
                          : "Unknown"}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#16a34a",
                        fontWeight: 800,
                      }}
                    >
                      Open request →
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 24,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 18,
                position: "sticky",
                top: 180,
                background: "#fff",
                zIndex: 4,
                paddingBottom: 10,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 900,
                    color: "#111827",
                  }}
                >
                  Review Request
                </h2>
                <p style={{ color: "#6b7280", marginTop: 8 }}>
                  Review documents, verify them, then approve or reject.
                </p>
              </div>

              <button
                onClick={() => {
                  setSelected(null);
                  setDocuments([]);
                  setTrip(null);
                }}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  padding: "0 16px",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                ← Back
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 18,
                  padding: 16,
                  background: "#f9fafb",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>
                  ROUTE
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 24,
                    fontWeight: 900,
                    color: "#111827",
                  }}
                >
                  {(trip?.departure_city || "Unknown")} →{" "}
                  {(trip?.destination_city || "Unknown")}
                </div>
                <div style={{ marginTop: 8, color: "#6b7280" }}>
                  {trip?.title || "Untitled trip"}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 18,
                  padding: 16,
                  background: "#f9fafb",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>
                  FLIGHT
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 24,
                    fontWeight: 900,
                    color: "#111827",
                  }}
                >
                  {[trip?.airline, trip?.flight_number]
                    .filter(Boolean)
                    .join(" • ") || "Not added"}
                </div>
                <div style={{ marginTop: 8, color: "#6b7280" }}>
                  Request: {selected.request_status} • Pass: {selected.pass_status}
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 900, color: "#111827" }}>
              Documents
            </h3>

            {loadingDetails ? (
              <p style={{ color: "#6b7280" }}>Loading request details...</p>
            ) : documents.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No documents found for this trip.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginTop: 12,
                  maxHeight: "48vh",
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 16,
                      padding: 16,
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div
                          style={{
                            fontWeight: 900,
                            color: "#111827",
                            textTransform: "capitalize",
                            fontSize: 18,
                          }}
                        >
                          {(doc.document_type ?? "document").replace("_", " ")}
                        </div>

                        <div style={{ marginTop: 6, color: "#6b7280" }}>
                          {doc.file_name ?? "Unnamed file"}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            fontWeight: 800,
                            color: doc.verified ? "#166534" : "#b45309",
                          }}
                        >
                          {doc.verified ? "Verified" : "Pending verification"}
                        </div>

                        {doc.file_url ? (
                          <div style={{ marginTop: 10 }}>
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "#2563eb",
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                            >
                              View document
                            </a>
                          </div>
                        ) : null}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <button
                          onClick={() => toggleVerify(doc)}
                          disabled={busy}
                          style={{
                            background: doc.verified ? "#fff7ed" : "#dcfce7",
                            color: doc.verified ? "#9a3412" : "#166534",
                            border: doc.verified
                              ? "1px solid #fdba74"
                              : "1px solid #86efac",
                            borderRadius: 12,
                            padding: "10px 14px",
                            fontWeight: 900,
                            cursor: "pointer",
                            minWidth: 140,
                          }}
                        >
                          {doc.verified ? "Mark Pending" : "Verify Document"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 24,
                position: "sticky",
                bottom: 0,
                background: "#fff",
                paddingTop: 14,
              }}
            >
              <button
                onClick={() => updateRequest("approve")}
                disabled={busy}
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 18px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ✅ Approve & Generate Airport QR
              </button>

              <button
                onClick={() => updateRequest("reject")}
                disabled={busy}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 18px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ❌ Reject Request
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}