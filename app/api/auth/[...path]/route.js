import { getAuth, isAuthConfigured } from "@/lib/auth/server";

async function unavailable() {
  return Response.json(
    { error: "Neon Auth is not configured." },
    { status: 503 }
  );
}

async function handle(method, request, context) {
  if (!isAuthConfigured()) return unavailable();
  const handlers = getAuth().handler();
  return handlers[method](request, context);
}

export function GET(request, context) {
  return handle("GET", request, context);
}

export function POST(request, context) {
  return handle("POST", request, context);
}

export function PUT(request, context) {
  return handle("PUT", request, context);
}

export function PATCH(request, context) {
  return handle("PATCH", request, context);
}

export function DELETE(request, context) {
  return handle("DELETE", request, context);
}
