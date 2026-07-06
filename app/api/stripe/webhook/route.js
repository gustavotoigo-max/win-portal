import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

function licenseKey() {
  return `WIN-${randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`;
}

export async function POST(request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const supabase = createAdminClient();
    const orderNumber = `ORD-${String(session.created).slice(-6)}`;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent,
        status: "paid",
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        customer_email: session.customer_details?.email
      })
      .select("id")
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const { error: licenseError } = await supabase.from("licenses").insert({
      order_id: order.id,
      license_key: licenseKey(),
      status: "active",
      max_machines: 1
    });

    if (licenseError) {
      return NextResponse.json({ error: licenseError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
