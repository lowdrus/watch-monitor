import { NextResponse } from "next/server";
import { getSponsorshipById } from "@/lib/sponsorships";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const sponsorship = await getSponsorshipById(id);

    if (!sponsorship) {
      return NextResponse.json(
        { message: "Patrocinio nao encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      sponsorship,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o patrocinio.",
      },
      { status: 500 },
    );
  }
}
