import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request) {
  try {
    const form = await request.formData();
    const locale = form.get("locale") || "pt";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const price = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

    if (!price) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_STRIPE_PRICE_ID." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      success_url: `${siteUrl}/${locale}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/${locale}?checkout=cancelled`,
      metadata: {
        product: "winportal-license"
      }
    });

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
