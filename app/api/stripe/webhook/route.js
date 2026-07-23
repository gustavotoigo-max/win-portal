import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { encryptLicenseKey, licenseKeyHash } from "@/lib/license-crypto";
import { queryOne } from "@/lib/neon/database";
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
    const orderNumber = `ORD-${String(session.created).slice(-6)}`;

    const productId = session.metadata?.product_id || null;
    const customerEmail = session.customer_details?.email || session.customer_email || null;
    const order = await queryOne(
      `insert into public.orders (
         order_number, stripe_session_id, stripe_payment_intent_id, status,
         amount, currency, customer_email, product_id
       )
       values ($1, $2, $3, 'paid', $4, $5, $6, $7)
       on conflict (stripe_session_id) do update set status = 'paid'
       returning id`,
      [
        orderNumber,
        session.id,
        session.payment_intent,
        session.amount_total || 0,
        session.currency || "usd",
        customerEmail,
        productId
      ]
    );

    const key = licenseKey();
    await queryOne(
      `insert into public.licenses (
         order_id, customer_email, product_id, license_key_hash,
         license_key_hint, license_key_ciphertext, status, max_machines
       )
       select $1, $2, $3, $4, $5, $6, 'active', 1
       where not exists (
         select 1 from public.licenses where order_id = $1
       )
       returning id`,
      [
        order.id,
        customerEmail,
        productId,
        licenseKeyHash(key),
        key.slice(-4),
        encryptLicenseKey(key)
      ]
    );
  }

  return NextResponse.json({ received: true });
}
