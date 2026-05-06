import { createClient } from "@supabase/supabase-js";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function getSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function creditWallet(params: Record<string, string | string[] | undefined>) {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Supabase URL is missing.");
  if (!serviceRoleKey) throw new Error("Service role key is missing.");

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const paymentIdFromUrl = getSingle(params.payment_id);
  const sessionIdFromUrl = getSingle(params.session_id);

  let paymentQuery = admin.from("payments").select("*");

  if (paymentIdFromUrl) {
    paymentQuery = paymentQuery.eq("id", paymentIdFromUrl);
  } else if (sessionIdFromUrl) {
    paymentQuery = paymentQuery.eq("stripe_session_id", sessionIdFromUrl);
  } else {
    throw new Error("Missing payment ID.");
  }

  const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();

  if (paymentError) throw paymentError;
  if (!payment) throw new Error("Payment not found.");

  const paymentId = payment.id;

  await admin
    .from("payments")
    .update({
      payment_status: "paid",
      paid_at: payment.paid_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (payment.reference_table === "work_orders" && payment.reference_id) {
    await admin
      .from("work_orders")
      .update({
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.reference_id);
  }

  const receiverCompanyId = payment.receiver_company_id;
  const amount = Number(payment.amount || 0);
  const currency = payment.currency || "SZL";

  if (!receiverCompanyId || amount <= 0) {
    return "Payment marked paid, but no receiver company was found.";
  }

  const { data: existingTx } = await admin
    .from("company_wallet_transactions")
    .select("id")
    .eq("payment_id", paymentId)
    .eq("transaction_type", "sale_income")
    .maybeSingle();

  if (existingTx?.id) {
    return "Payment already added to wallet.";
  }

  const { data: existingWallet, error: walletFindError } = await admin
    .from("company_wallets")
    .select("*")
    .eq("company_id", receiverCompanyId)
    .maybeSingle();

  if (walletFindError) throw walletFindError;

  let walletId = existingWallet?.id;

  if (walletId) {
    const { error: walletUpdateError } = await admin
      .from("company_wallets")
      .update({
        balance: Number(existingWallet.balance || 0) + amount,
        available_balance: Number(existingWallet.available_balance || 0) + amount,
        total_received: Number(existingWallet.total_received || 0) + amount,
        currency,
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletId);

    if (walletUpdateError) throw walletUpdateError;
  } else {
    const { data: newWallet, error: walletCreateError } = await admin
      .from("company_wallets")
      .insert({
        company_id: receiverCompanyId,
        currency,
        balance: amount,
        available_balance: amount,
        pending_balance: 0,
        total_received: amount,
        total_withdrawn: 0,
      })
      .select("id")
      .single();

    if (walletCreateError) throw walletCreateError;
    walletId = newWallet.id;
  }

  const { error: txError } = await admin
    .from("company_wallet_transactions")
    .insert({
      wallet_id: walletId,
      company_id: receiverCompanyId,
      payment_id: paymentId,
      order_id: payment.reference_table === "work_orders" ? payment.reference_id : null,
      transaction_type: "sale_income",
      amount,
      currency,
      status: "completed",
      note: "Marketplace order payment received",
    });

  if (txError) throw txError;

  return "Payment completed and wallet updated. You can now go back to the Berries app.";
}

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const params = (await searchParams) || {};

  let message = "Your payment was completed. You can now go back to the Berries app.";

  try {
    message = await creditWallet(params);
  } catch (err: any) {
    message = err?.message || "Payment completed, but wallet sync failed.";
  }

  return (
    <main style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>Payment Successful ✅</h1>
      <p>{message}</p>
    </main>
  );
}