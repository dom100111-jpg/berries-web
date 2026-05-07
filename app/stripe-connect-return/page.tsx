export default function StripeConnectReturnPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: "sans-serif",
      }}
    >
      <h1>Stripe Setup Complete</h1>
      <p>You can now return to the Berries app.</p>
    </div>
  );
}