import { SponsorshipDashboard } from "@/app/dashboard";
import { getScheduleEntries, getSponsorships } from "@/lib/sponsorships";
import type { Sponsorship } from "@/lib/sponsorships";
import type { ScheduleEntry } from "@/lib/sponsorships";

export default async function Home() {
  let sponsorships: Sponsorship[] = [];
  let schedule: ScheduleEntry[] = [];
  let loadError: string | undefined;

  try {
    [sponsorships, schedule] = await Promise.all([
      getSponsorships(),
      getScheduleEntries(),
    ]);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Nao foi possivel carregar os patrocinios.";
  }

  return (
    <SponsorshipDashboard
      sponsorships={sponsorships}
      schedule={schedule}
      loadError={loadError}
    />
  );
}
