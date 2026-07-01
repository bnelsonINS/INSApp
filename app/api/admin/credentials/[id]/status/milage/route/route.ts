import { NextRequest, NextResponse } from "next/server";

const FEDERAL_MILEAGE_RATE = 0.725;
const METERS_PER_MILE = 1609.344;

function parseGoogleDuration(duration: string | null | undefined) {
  if (!duration) return null;

  const seconds = Number(String(duration).replace("s", ""));
  if (!Number.isFinite(seconds)) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
  if (hours > 0) return `${hours} hr`;
  return `${minutes} min`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key is not configured." },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => null);
    const origin = String(body?.origin || "").trim();
    const destination = String(body?.destination || "").trim();

    if (!origin || !destination) {
      return NextResponse.json(
        { error: "Starting location and destination are required." },
        { status: 400 },
      );
    }

    const googleResponse = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.localizedValues",
        },
        body: JSON.stringify({
          origin: { address: origin },
          destination: { address: destination },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          computeAlternativeRoutes: false,
          units: "IMPERIAL",
        }),
      },
    );

    const data = await googleResponse.json();

    if (!googleResponse.ok) {
      console.error("Google Routes API error:", data);
      return NextResponse.json(
        { error: "Google could not calculate this route.", details: data },
        { status: googleResponse.status },
      );
    }

    const route = data.routes?.[0];
    const distanceMeters = Number(route?.distanceMeters ?? 0);

    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      return NextResponse.json(
        { error: "No driving route was returned for those addresses." },
        { status: 404 },
      );
    }

    const miles = Math.round((distanceMeters / METERS_PER_MILE) * 100) / 100;
    const amount = Math.round(miles * FEDERAL_MILEAGE_RATE * 100) / 100;

    return NextResponse.json({
      miles,
      distanceText:
        route.localizedValues?.distance?.text || `${miles.toFixed(2)} mi`,
      duration: route.duration || null,
      durationText:
        route.localizedValues?.duration?.text || parseGoogleDuration(route.duration),
      rate: FEDERAL_MILEAGE_RATE,
      amount,
    });
  } catch (error) {
    console.error("Mileage route calculation error:", error);
    return NextResponse.json(
      { error: "Unable to calculate mileage." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with origin and destination." },
    { status: 405 },
  );
}
