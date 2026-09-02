"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import NextImage from "next/image";
import {
  Card,
  Chip,
  Drawer,
  ProgressBar,
  Switch,
  Tabs,
  useTheme,
} from "@heroui/react";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  Moon,
  PlayCircle,
  Search,
  Sparkles,
  Sun,
  Tv,
} from "lucide-react";
import type {
  ScheduleEntry,
  Sponsorship,
  SponsorshipCategory,
} from "@/lib/sponsorships";

type DashboardProps = {
  sponsorships: Sponsorship[];
  schedule: ScheduleEntry[];
  loadError?: string;
};

type SponsorshipGroup = {
  id: string;
  title: string;
  category: SponsorshipCategory;
  seasons: Sponsorship[];
  primary: Sponsorship;
};

type CatalogSection = {
  id: string;
  title: string;
  groups: SponsorshipGroup[];
};

const statusLabels: Record<Sponsorship["status"], string> = {
  "nao-iniciado": "Na fila",
  "em-andamento": "Em andamento",
  finalizado: "Finalizado",
};

const statusColors: Record<
  Sponsorship["status"],
  "default" | "accent" | "success"
> = {
  "nao-iniciado": "default",
  "em-andamento": "accent",
  finalizado: "success",
};

const categoryIcons: Record<SponsorshipCategory, typeof Tv> = {
  Anime: Sparkles,
  Serie: Tv,
  Filme: Film,
};

export function SponsorshipDashboard({
  sponsorships,
  schedule,
  loadError,
}: DashboardProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Sponsorship | null>(null);

  const groups = useMemo(() => groupSponsorships(sponsorships), [sponsorships]);

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return groups.filter((group) => {
      const searchIndex = group.seasons
        .map(
          (item) =>
            `${item.title} ${item.season ?? ""} ${item.tmdb?.title ?? ""}`,
        )
        .join(" ")
        .toLowerCase();
      const matchesQuery =
        !normalizedQuery || searchIndex.includes(normalizedQuery);

      return matchesQuery;
    });
  }, [groups, query]);

  const catalogSections = useMemo(
    () => createCatalogSections(visibleGroups),
    [visibleGroups],
  );

  const activeItems = sponsorships.filter(
    (item) => item.status === "em-andamento",
  );
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm font-medium text-muted">
              <Clapperboard size={18} />
              Watch Monitor
            </div>
            <ThemeToggle />
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div className="max-w-3xl">
              <Chip color="accent" size="sm" variant="soft">
                Patrocinios de live stream
              </Chip>
              <h1 className="mt-4 text-3xl font-semibold leading-tight text-foreground sm:text-5xl">
                Organizacao editorial para conteudos pagos
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                Gerencie pedidos pagos, acompanhe episodios assistidos e
                organize proximas lives em uma experiencia editorial enriquecida
                com dados do TMDB.
              </p>
            </div>

            <Card className="rounded-md border border-border bg-surface-secondary shadow-none">
              <Card.Content className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Em acompanhamento
                    </p>
                    <p className="text-sm text-muted">
                      {activeItems.length || 0} titulo(s) em andamento
                    </p>
                  </div>
                  <PlayCircle className="text-accent" size={22} />
                </div>
                <div className="space-y-2">
                  {activeItems.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      className="flex w-full items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 text-left text-sm hover:bg-surface-tertiary"
                      onClick={() => setSelected(item)}
                    >
                      <span className="min-w-0 truncate">{item.title}</span>
                      <span className="shrink-0 text-muted">
                        {item.episodeTracking?.lastWatchedEpisode
                          ? `ep ${item.episodeTracking.lastWatchedEpisode}`
                          : item.season}
                      </span>
                    </button>
                  ))}
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-5">
          {loadError ? (
            <Card className="border border-danger bg-danger-soft shadow-none">
              <Card.Content className="text-danger-soft-foreground">
                {loadError}
              </Card.Content>
            </Card>
          ) : null}

          <CalendarBoard schedule={schedule} />

          <div className="max-w-2xl">
            <label className="flex h-12 items-center gap-3 rounded-md border border-border bg-field px-3 text-field-foreground shadow-field">
              <Search className="shrink-0 text-muted" size={20} />
              <input
                aria-label="Buscar conteudo"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-field-placeholder"
                placeholder="Buscar por titulo, temporada ou nome no TMDB"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          <CatalogRows
            sections={catalogSections}
            onOpen={(item) => setSelected(item)}
          />
        </div>
      </section>

      <DetailsDrawer
        group={selected ? groups.find((group) => group.seasons.some((item) => item.id === selected.id)) : undefined}
        item={selected}
        onSelect={setSelected}
        onClose={() => setSelected(null)}
      />
    </main>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme("system");
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = isClient && resolvedTheme === "dark";

  return (
    <Switch
      aria-label="Alternar tema"
      className="text-sm font-medium text-muted"
      isSelected={isDark}
      size="sm"
      onChange={(selected) => setTheme(selected ? "dark" : "light")}
    >
      <Switch.Content className="gap-2">
        <Switch.Control className="bg-default">
          <Switch.Thumb>
            <Switch.Icon>
              {isDark ? <Moon size={12} /> : <Sun size={12} />}
            </Switch.Icon>
          </Switch.Thumb>
        </Switch.Control>
        {isDark ? "Escuro" : "Claro"}
      </Switch.Content>
    </Switch>
  );
}

function CalendarBoard({
  schedule,
}: {
  schedule: ScheduleEntry[];
}) {
  const weeks = useMemo(() => getCalendarWeeks(schedule), [schedule]);
  const [weekIndex, setWeekIndex] = useState(0);
  const currentWeek = weeks[Math.min(weekIndex, Math.max(weeks.length - 1, 0))];
  const days = currentWeek?.days ?? [];
  const byDate = new Map(days.map((day) => [day, [] as ScheduleEntry[]]));
  const weekLabel = currentWeek
    ? `${formatCalendarDate(currentWeek.days[0])} - ${formatCalendarDate(
        currentWeek.days[6],
      )}`
    : "Sem datas";

  for (const entry of schedule) {
    if (byDate.has(entry.date)) {
      byDate.get(entry.date)?.push(entry);
    }
  }

  return (
    <Card className="rounded-md border border-border bg-surface shadow-none">
      <Card.Content className="p-4">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase text-muted">
              Cronograma
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {weekLabel}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted hover:bg-default hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={weekIndex === 0}
              onClick={() => setWeekIndex((index) => Math.max(index - 1, 0))}
            >
              <ChevronLeft size={18} />
            </button>
            <Chip color="accent" size="sm" variant="soft">
              {schedule.length} item(s)
            </Chip>
            <button
              className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted hover:bg-default hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={weekIndex >= weeks.length - 1}
              onClick={() =>
                setWeekIndex((index) => Math.min(index + 1, weeks.length - 1))
              }
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-border bg-surface-secondary">
              {days.map((day) => (
                <div
                  key={day}
                  className="border-r border-border px-3 py-2 last:border-r-0"
                >
                  <p className="text-xs font-medium uppercase text-muted">
                    {formatWeekday(day)}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {formatDayNumber(day)}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 bg-surface">
              {days.map((day) => {
                const entries = byDate.get(day) ?? [];

                return (
                  <div
                    key={day}
                    className="min-h-44 border-r border-border p-3 last:border-r-0"
                  >
                    <div className="space-y-2">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-md border border-border bg-surface-secondary px-2 py-2 text-xs"
                        >
                          <p className="font-medium text-foreground">
                            {entry.title}
                          </p>
                          {entry.episodes.length > 0 ? (
                            <p className="text-muted">
                              eps {entry.episodes.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ))}
                      {entries.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border px-2 py-3 text-xs text-muted">
                          Sem live
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {weeks.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-border p-4 text-sm text-muted">
            Nenhuma data encontrada na aba de cronograma.
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function CatalogRows({
  sections,
  onOpen,
}: {
  sections: CatalogSection[];
  onOpen: (item: Sponsorship) => void;
}) {
  if (sections.length === 0) {
    return <SponsorshipCards groups={[]} onOpen={onOpen} />;
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`catalog-${section.id}`}>
          <h2
            id={`catalog-${section.id}`}
            className="mb-4 text-xl font-semibold text-foreground"
          >
            {section.title}
          </h2>
          <SponsorshipCards groups={section.groups} onOpen={onOpen} />
        </section>
      ))}
    </div>
  );
}

function SponsorshipCards({
  groups,
  onOpen,
}: {
  groups: SponsorshipGroup[];
  onOpen: (item: Sponsorship) => void;
}) {
  if (groups.length === 0) {
    return (
      <Card className="rounded-md border border-dashed border-border bg-surface shadow-none">
        <Card.Content className="flex min-h-48 items-center justify-center text-sm text-muted">
          Nenhum patrocinio encontrado com os filtros atuais.
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map((group) => (
        <SponsorshipCard key={group.id} group={group} onOpen={onOpen} />
      ))}
    </div>
  );
}

function SponsorshipCard({
  group,
  onOpen,
}: {
  group: SponsorshipGroup;
  onOpen: (item: Sponsorship) => void;
}) {
  const [selectedKey, setSelectedKey] = useState(group.primary.id);
  const item =
    group.seasons.find((season) => season.id === selectedKey) ?? group.primary;
  const Icon = categoryIcons[group.category];
  const imageUrl = item.tmdb?.posterUrl ?? item.tmdb?.backdropUrl;

  return (
    <Card
      className="cursor-pointer rounded-md border border-border bg-surface shadow-none transition-colors hover:bg-surface-hover"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item);
        }
      }}
    >
      <Card.Content className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-start gap-4">
          <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md bg-surface-secondary text-muted">
            {imageUrl ? (
              <NextImage
                alt={item.tmdb?.title ?? item.title}
                className="object-cover"
                fill
                sizes="80px"
                src={imageUrl}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <Icon size={26} />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-foreground">
              {group.title}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <Icon size={14} />
              {group.category}
              {item.tmdb?.year ? ` · ${item.tmdb.year}` : ""}
            </p>

            <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
              {item.tmdb?.overview || "Sem sinopse encontrada no TMDB."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusChip group={group} />
          <ScheduleSummary group={group} />
        </div>

        <SeasonTabs
          group={group}
          selectedKey={item.id}
          onSelectionChange={setSelectedKey}
        />
        <ProgressSummary item={item} />
      </Card.Content>
    </Card>
  );
}

function SeasonTabs({
  group,
  selectedKey,
  onSelectionChange,
}: {
  group: SponsorshipGroup;
  selectedKey: string;
  onSelectionChange: (key: string) => void;
}) {
  if (group.seasons.length === 1) {
    return (
      <div className="text-xs font-medium text-muted">
        {formatSeasonLabel(group.seasons[0])}
      </div>
    );
  }

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Tabs
        aria-label={`Temporadas de ${group.title}`}
        className="w-full"
        selectedKey={selectedKey}
        variant="secondary"
        onSelectionChange={(key) => onSelectionChange(String(key))}
      >
        <Tabs.ListContainer>
          <Tabs.List className="bg-transparent p-0">
            {group.seasons.map((item) => (
              <Tabs.Tab key={item.id} id={item.id} className="h-8 px-2 text-xs">
                <Tabs.Indicator />
                {formatSeasonLabel(item)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </div>
  );
}

function ProgressSummary({ item }: { item: Sponsorship }) {
  if (!item.episodeTracking) {
    return <span className="text-sm text-muted">Sem controle por episodios</span>;
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between gap-3 text-xs">
          <span className="text-muted">{item.season ?? item.title}</span>
          <span className="font-medium text-foreground">
            {formatEpisodeProgress(item)}
          </span>
        </div>
        <ProgressBar
          aria-label={`Progresso de ${item.title} ${item.season ?? ""}`}
          color={item.episodeTracking?.isCompleteByTmdb ? "success" : "accent"}
          value={item.episodeTracking?.completionPercent ?? 0}
        >
          <ProgressBar.Track className="h-2">
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>
    </div>
  );
}

function ScheduleSummary({ group }: { group: SponsorshipGroup }) {
  const count = group.seasons.reduce(
    (total, item) => total + item.scheduleEntries.length,
    0,
  );
  const next = group.seasons.flatMap((item) => item.scheduleEntries)[0];

  return (
    <Chip size="sm" variant="tertiary">
      {count > 0 ? `${count} live(s)` : "Sem data"}
      {next ? (
        <span className="text-muted">
          {" "}
          · {next.weekday} {next.displayDate}
        </span>
      ) : null}
    </Chip>
  );
}

function StatusChip({ group }: { group: SponsorshipGroup }) {
  const finished = group.seasons.filter(
    (item) => item.status === "finalizado",
  ).length;

  return (
    <div className="min-w-32">
      <Chip color={statusColors[group.primary.status]} size="sm" variant="soft">
        {finished === group.seasons.length
          ? "Completo"
          : statusLabels[group.primary.status]}
      </Chip>
    </div>
  );
}

function DetailsDrawer({
  group,
  item,
  onSelect,
  onClose,
}: {
  group?: SponsorshipGroup;
  item: Sponsorship | null;
  onSelect: (item: Sponsorship) => void;
  onClose: () => void;
}) {
  if (!item) return null;

  const tracking = item.episodeTracking;
  const episodePercent = tracking?.completionPercent ?? 0;

  return (
    <Drawer isOpen onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog>
            <Drawer.Header>
              <Drawer.Heading>{item.title}</Drawer.Heading>
              <Drawer.CloseTrigger aria-label="Fechar" />
            </Drawer.Header>
            <Drawer.Body className="space-y-5">
              {group && group.seasons.length > 1 ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Temporadas patrocinadas
                  </h3>
                  <Tabs
                    aria-label={`Temporadas de ${group.title}`}
                    className="w-full"
                    selectedKey={item.id}
                    variant="secondary"
                    onSelectionChange={(key) => {
                      const season = group.seasons.find(
                        (option) => option.id === key,
                      );
                      if (season) onSelect(season);
                    }}
                  >
                    <Tabs.ListContainer>
                      <Tabs.List className="bg-transparent p-0">
                        {group.seasons.map((season) => (
                          <Tabs.Tab
                            key={season.id}
                            id={season.id}
                            className="h-8 px-2 text-xs"
                          >
                            <Tabs.Indicator />
                            {formatSeasonLabel(season)}
                          </Tabs.Tab>
                        ))}
                      </Tabs.List>
                    </Tabs.ListContainer>
                  </Tabs>
                </section>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Chip color={statusColors[item.status]} size="sm" variant="soft">
                  {statusLabels[item.status]}
                </Chip>
                {item.season ? (
                  <Chip size="sm" variant="tertiary">
                    {item.season}
                  </Chip>
                ) : null}
                {item.tmdb?.year ? (
                  <Chip size="sm" variant="tertiary">
                    {item.tmdb.year}
                  </Chip>
                ) : null}
                {item.tmdb?.runtimeMinutes ? (
                  <Chip size="sm" variant="tertiary">
                    {item.tmdb.runtimeMinutes} min
                  </Chip>
                ) : null}
                {item.tmdb?.status ? (
                  <Chip size="sm" variant="tertiary">
                    TMDB: {item.tmdb.status}
                  </Chip>
                ) : null}
              </div>

              <p className="text-sm leading-6 text-muted">
                {item.tmdb?.overview || "Sem sinopse encontrada no TMDB."}
              </p>

              {item.tmdb?.genres.length ? (
                <div className="flex flex-wrap gap-2">
                  {item.tmdb.genres.map((genre) => (
                    <Chip key={genre} size="sm" variant="tertiary">
                      {genre}
                    </Chip>
                  ))}
                </div>
              ) : null}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Episodios assistidos
                </h3>
                {tracking ? (
                  <>
                    <ProgressBar
                      aria-label="Episodios assistidos"
                      color="accent"
                      value={episodePercent}
                    >
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-muted">
                          {formatEpisodeProgress(item)}
                        </span>
                        {tracking.nextEpisode ? (
                          <span className="text-muted">
                            proximo ep {tracking.nextEpisode}
                          </span>
                        ) : null}
                      </div>
                      <ProgressBar.Track>
                        <ProgressBar.Fill />
                      </ProgressBar.Track>
                    </ProgressBar>
                    {tracking.nextEpisodeName ? (
                      <p className="text-sm text-muted">
                        Proximo: {tracking.nextEpisodeName}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1">
                      {tracking.watchedEpisodes.slice(0, 80).map((episode) => (
                        <span
                          key={episode}
                          className="flex size-7 items-center justify-center rounded bg-success-soft text-xs font-medium text-success-soft-foreground"
                        >
                          {episode}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    {item.tmdb?.tv?.season
                      ? `${item.tmdb.tv.season.name}: ${item.tmdb.tv.season.episodeCount} episodio(s) no TMDB.`
                      : "Sem detalhamento de episodios para este patrocinio."}
                  </p>
                )}
              </section>

              {item.tmdb?.tv?.seasonDetails?.episodes.length ? (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Temporada no TMDB
                  </h3>
                  <div className="space-y-2">
                    {item.tmdb.tv.seasonDetails.episodes
                      .slice(0, 12)
                      .map((episode) => (
                        <div
                          key={episode.episodeNumber}
                          className="rounded-md bg-surface-secondary p-3"
                        >
                          <p className="text-sm font-medium text-foreground">
                            {episode.episodeNumber}. {episode.name || "Episodio"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted">
                            {episode.overview || "Sem sinopse."}
                          </p>
                        </div>
                      ))}
                  </div>
                </section>
              ) : null}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Relacao no cronograma
                </h3>
                {item.scheduleEntries.length > 0 ? (
                  <div className="space-y-2">
                    {item.scheduleEntries.map((entry) => (
                      <ScheduleListItem key={entry.id} entry={entry} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    Nenhuma live relacionada no cronograma atual.
                  </p>
                )}
              </section>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

function ScheduleListItem({ entry }: { entry: ScheduleEntry }) {
  return (
    <div className="rounded-md border border-border bg-surface-secondary p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{entry.title}</p>
          <p className="text-xs text-muted">
            {entry.weekday} · {entry.displayDate}
          </p>
        </div>
        {entry.episodes.length > 0 ? (
          <Chip size="sm" variant="tertiary">
            eps {entry.episodes.join(", ")}
          </Chip>
        ) : null}
      </div>
    </div>
  );
}

function getCalendarWeeks(schedule: ScheduleEntry[]) {
  const weekStarts = [
    ...new Set(
      schedule
        .map((entry) => getWeekStart(entry.date))
        .filter((date): date is string => Boolean(date)),
    ),
  ].sort();

  return weekStarts.map((startDate) => ({
    startDate,
    days: Array.from({ length: 7 }, (_, index) => addDays(startDate, index)),
  }));
}

function getWeekStart(dateValue: string) {
  const date = parseLocalDate(dateValue);
  if (!date) return undefined;

  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  return toDateKey(addDaysToDate(date, mondayOffset));
}

function addDays(dateValue: string, amount: number) {
  const date = parseLocalDate(dateValue);

  return date ? toDateKey(addDaysToDate(date, amount)) : dateValue;
}

function addDaysToDate(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + amount);

  return nextDate;
}

function parseLocalDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day, 12);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatCalendarDate(dateValue?: string) {
  const date = dateValue ? parseLocalDate(dateValue) : undefined;
  if (!date) return "";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function formatWeekday(dateValue: string) {
  const date = parseLocalDate(dateValue);
  if (!date) return "";

  return date.toLocaleDateString("pt-BR", { weekday: "short" });
}

function formatDayNumber(dateValue: string) {
  const date = parseLocalDate(dateValue);
  if (!date) return "";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatEpisodeProgress(item: Sponsorship) {
  const tracking = item.episodeTracking;
  if (!tracking) return "Sem episodios";

  if (tracking.totalEpisodes) {
    return `${tracking.watchedCount}/${tracking.totalEpisodes} eps`;
  }

  return `${tracking.watchedCount} eps vistos`;
}

function formatSeasonLabel(item: Sponsorship) {
  return `${item.season ?? "Unico"}${
    item.episodeTracking?.isCompleteByTmdb ? " completa" : ""
  }`;
}

function createCatalogSections(groups: SponsorshipGroup[]): CatalogSection[] {
  const titles: Record<SponsorshipCategory, string> = {
    Anime: "Animes",
    Serie: "Séries",
    Filme: "Filmes",
  };

  return (["Anime", "Serie", "Filme"] as SponsorshipCategory[])
    .map((category) => ({
      id: category.toLowerCase(),
      title: titles[category],
      groups: groups.filter((group) => group.category === category),
    }))
    .filter((section) => section.groups.length > 0);
}

function groupSponsorships(items: Sponsorship[]) {
  const groups = new Map<string, SponsorshipGroup>();

  for (const item of items) {
    const id = `${item.category}-${normalizeGroupTitle(item.title)}`;
    const existing = groups.get(id);

    if (existing) {
      existing.seasons.push(item);
      existing.primary = pickPrimary(existing.seasons);
    } else {
      groups.set(id, {
        id,
        title: item.title,
        category: item.category,
        seasons: [item],
        primary: item,
      });
    }
  }

  return [...groups.values()].map((group) => ({
    ...group,
    seasons: group.seasons.sort(
      (a, b) => getSeasonNumber(a) - getSeasonNumber(b),
    ),
    primary: pickPrimary(group.seasons),
  }));
}

function pickPrimary(items: Sponsorship[]) {
  return [...items].sort((a, b) => {
    const statusRank = getStatusRank(a.status) - getStatusRank(b.status);
    if (statusRank !== 0) return statusRank;

    return getSeasonNumber(a) - getSeasonNumber(b);
  })[0];
}

function getStatusRank(status: Sponsorship["status"]) {
  if (status === "em-andamento") return 0;
  if (status === "nao-iniciado") return 1;

  return 2;
}

function getSeasonNumber(item: Sponsorship) {
  const match = item.season?.match(/\d+/);

  return match ? Number(match[0]) : 0;
}

function normalizeGroupTitle(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
