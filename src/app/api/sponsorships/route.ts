import { NextResponse } from "next/server";
import { getSponsorships } from "@/lib/sponsorships";

export async function GET() {
  try {
    const sponsorships = await getSponsorships();

    return NextResponse.json({
      sponsorships,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os patrocinios.",
      },
      { status: 500 },
    );
  }
}
