import { NextResponse } from "next/server";
import { getScheduleEntries } from "@/lib/sponsorships";

export async function GET() {
  try {
    const schedule = await getScheduleEntries();

    return NextResponse.json({
      schedule,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o cronograma.",
      },
      { status: 500 },
    );
  }
}
