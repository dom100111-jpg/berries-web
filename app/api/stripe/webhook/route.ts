import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.text();

    console.log("Stripe webhook received:", body);

    return NextResponse.json(
      { received: true },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      { error: error.message || "Webhook failed" },
      { status: 500 }
    );
  }
}