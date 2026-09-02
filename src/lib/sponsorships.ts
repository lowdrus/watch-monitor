import Papa from "papaparse";

const SHEET_ID = "1pPtb2Z3-imu5kG5NCXFP8bnYNJcrHZKRaSN0f75nNo0";
const CONFIRMED_GID = "481130233";
const EPISODES_GID = "320152232";
const SCHEDULE_GID = "0";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

type SheetRow = string[];

export type SponsorshipCategory = "Anime" | "Serie" | "Filme";

export type EpisodeTracking = {
  title: string;
  seasonLabel?: string;
  statusLabel?: string;
  watchedEpisodes: number[];
  watchedCount: number;
  lastWatchedEpisode?: number;
  nextEpisode?: number;
  totalColumns: number;
  totalEpisodes?: number;
  remainingEpisodes?: number;
  completionPercent?: number;
  isCompleteByTmdb?: boolean;
  nextEpisodeName?: string;
};

export type ScheduleEntry = {
  id: string;
  date: string;
  displayDate: string;
  weekday: string;
  title: string;
  rawTitle: string;
  seasonNumber?: number;
  episodes: number[];
  sponsorshipId?: string;
};

export type Sponsorship = {
  id: string;
  title: string;
  category: SponsorshipCategory;
  season?: string;
  started: boolean;
  finished: boolean;
  status: "nao-iniciado" | "em-andamento" | "finalizado";
  episodeTracking?: EpisodeTracking;
  scheduleEntries: ScheduleEntry[];
  tmdb?: {
    id: number;
    title: string;
    overview: string;
    posterUrl?: string;
    backdropUrl?: string;
    year?: string;
    voteAverage?: number;
    mediaType: "movie" | "tv";
    genres: string[];
    originalTitle?: string;
    originalLanguage?: string;
    imdbId?: string;
    runtimeMinutes?: number;
    status?: string;
    tv?: {
      numberOfSeasons?: number;
      numberOfEpisodes?: number;
      episodeRunTime: number[];
      season?: TmdbSeasonSummary;
      seasonDetails?: TmdbSeasonDetails;
    };
  };
};

export type TmdbSeasonSummary = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate?: string;
  posterUrl?: string;
};

export type TmdbSeasonDetails = {
  seasonNumber: number;
  name: string;
  overview: string;
  episodeCount: number;
  airDate?: string;
  posterUrl?: string;
  episodes: TmdbEpisode[];
};

export type TmdbEpisode = {
  episodeNumber: number;
  name: string;
  overview: string;
  airDate?: string;
  runtimeMinutes?: number;
  stillUrl?: string;
  voteAverage?: number;
};

type TmdbSearchResult = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
};

type TmdbGenre = {
  id: number;
  name: string;
};

type TmdbTvDetails = {
  id: number;
  name?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  vote_average?: number;
  genres?: TmdbGenre[];
  original_language?: string;
  status?: string;
  number_of_episodes?: number;
  number_of_seasons?: number;
  episode_run_time?: number[];
  seasons?: TmdbTvSeasonSummaryRaw[];
  external_ids?: {
    imdb_id?: string | null;
  };
};

type TmdbTvSeasonSummaryRaw = {
  air_date?: string;
  episode_count?: number;
  name?: string;
  poster_path?: string | null;
  season_number?: number;
};

type TmdbMovieDetails = {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  genres?: TmdbGenre[];
  original_language?: string;
  status?: string;
  runtime?: number | null;
  imdb_id?: string | null;
};

type TmdbSeasonResponse = {
  air_date?: string;
  episodes?: Array<{
    air_date?: string;
    episode_number?: number;
    name?: string;
    overview?: string;
    runtime?: number | null;
    still_path?: string | null;
    vote_average?: number;
  }>;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  season_number?: number;
};

type CategoryLayout = {
  category: SponsorshipCategory;
  title: number;
  season?: number;
  started: number;
  finished: number;
};

const CATEGORY_LAYOUT: CategoryLayout[] = [
  { category: "Anime", title: 0, season: 1, started: 2, finished: 3 },
  { category: "Serie", title: 5, season: 6, started: 7, finished: 8 },
  { category: "Filme", title: 10, started: 11, finished: 12 },
];

export async function getSponsorships(): Promise<Sponsorship[]> {
  const [confirmedRows, episodeRows, scheduleRows] = await Promise.all([
    fetchSheetRows(CONFIRMED_GID),
    fetchSheetRows(EPISODES_GID),
    fetchSheetRows(SCHEDULE_GID),
  ]);
  const episodeTrackings = parseEpisodeRows(episodeRows);
  const scheduleEntries = parseScheduleRows(scheduleRows);
  const items = parseSponsorshipRows(
    confirmedRows,
    episodeTrackings,
    scheduleEntries,
  );
  const enriched = await enrichWithTmdb(items);

  return enriched.sort((a, b) => {
    const statusOrder = statusRank(a.status) - statusRank(b.status);
    if (statusOrder !== 0) return statusOrder;

    return a.title.localeCompare(b.title, "pt-BR");
  });
}

export async function getScheduleEntries(): Promise<ScheduleEntry[]> {
  const [confirmedRows, scheduleRows] = await Promise.all([
    fetchSheetRows(CONFIRMED_GID),
    fetchSheetRows(SCHEDULE_GID),
  ]);
  const sponsorships = parseSponsorshipRows(confirmedRows, [], []);

  return attachScheduleRelations(parseScheduleRows(scheduleRows), sponsorships);
}

export async function getSponsorshipById(id: string) {
  const sponsorships = await getSponsorships();

  return sponsorships.find((item) => item.id === id);
}

async function fetchSheetRows(gid: string) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const response = await fetch(url, { next: { revalidate: 60 * 10 } });

  if (!response.ok) {
    throw new Error(`Falha ao buscar planilha: ${response.status}`);
  }

  const csv = await response.text();
  const parsed = Papa.parse<SheetRow>(csv, { skipEmptyLines: false });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "CSV invalido");
  }

  return parsed.data;
}

function parseSponsorshipRows(
  rows: SheetRow[],
  episodeTrackings: EpisodeTracking[],
  scheduleEntries: ScheduleEntry[],
) {
  const items: Sponsorship[] = [];

  for (const row of rows.slice(3)) {
    for (const layout of CATEGORY_LAYOUT) {
      const title = cleanTitle(row[layout.title]);
      if (!title) continue;

      const season =
        layout.season !== undefined ? cleanTitle(row[layout.season]) : undefined;
      const id = makeSponsorshipId(layout.category, title, season);
      const started = toBoolean(row[layout.started]);
      const finished = toBoolean(row[layout.finished]);

      items.push({
        id,
        title,
        category: layout.category,
        season,
        started,
        finished,
        status: getStatus(started, finished),
        episodeTracking: findEpisodeTracking(title, season, episodeTrackings),
        scheduleEntries: [],
      });
    }
  }

  const relatedSchedule = attachScheduleRelations(scheduleEntries, items);

  return items.map((item) => ({
    ...item,
    scheduleEntries: relatedSchedule.filter(
      (entry) => entry.sponsorshipId === item.id,
    ),
  }));
}

function parseEpisodeRows(rows: SheetRow[]) {
  const trackings: EpisodeTracking[] = [];

  for (const row of rows.slice(2)) {
    const rawTitle = cleanTitle(row[0]);
    if (!rawTitle) continue;

    const parsedTitle = parseTitleAndSeason(rawTitle, row[1]);
    const watchedEpisodes = getContinuousWatchedEpisodes(row.slice(2));
    const lastWatchedEpisode = watchedEpisodes.at(-1);

    trackings.push({
      title: parsedTitle.title,
      seasonLabel: parsedTitle.seasonLabel,
      statusLabel: cleanTitle(row[1]),
      watchedEpisodes,
      watchedCount: watchedEpisodes.length,
      lastWatchedEpisode,
      nextEpisode: lastWatchedEpisode !== undefined ? lastWatchedEpisode + 1 : 1,
      totalColumns: row.slice(2).length,
    });
  }

  return trackings;
}

function parseScheduleRows(rows: SheetRow[]) {
  const entries: ScheduleEntry[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (!isWeekdayHeader(row)) continue;

    const dateRow = rows[rowIndex + 1] ?? [];
    const weekdays = row.slice(0, 7).map(cleanTitle);
    let contentRowIndex = rowIndex + 2;

    while (contentRowIndex < rows.length) {
      const contentRow = rows[contentRowIndex] ?? [];
      if (isWeekdayHeader(contentRow)) break;
      if (contentRow.slice(0, 7).every((cell) => !cleanTitle(cell))) break;

      for (let column = 0; column < 7; column += 1) {
        const rawTitle = cleanTitle(contentRow[column]);
        const displayDate = cleanTitle(dateRow[column]);
        const date = parseBrazilianDate(displayDate);

        if (!rawTitle || !date) continue;

        entries.push({
          id: makeScheduleId(date, column, contentRowIndex, rawTitle),
          date,
          displayDate,
          weekday: weekdays[column] ?? "",
          rawTitle,
          title: cleanScheduleTitle(rawTitle),
          seasonNumber: parseSeasonNumber(rawTitle),
          episodes: parseEpisodesFromText(rawTitle),
        });
      }

      contentRowIndex += 1;
    }
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

function attachScheduleRelations(
  entries: ScheduleEntry[],
  sponsorships: Pick<Sponsorship, "id" | "title" | "season">[],
) {
  return entries.map((entry) => {
    const match = sponsorships.find((item) => isSameContent(entry, item));

    return {
      ...entry,
      sponsorshipId: match?.id,
    };
  });
}

function findEpisodeTracking(
  title: string,
  season: string | undefined,
  trackings: EpisodeTracking[],
) {
  return trackings.find((tracking) => {
    if (normalizeKey(tracking.title) !== normalizeKey(title)) return false;

    const trackingSeason = parseSeasonNumber(tracking.seasonLabel);
    const sponsorshipSeason = parseSeasonNumber(season);

    return (
      trackingSeason === undefined ||
      sponsorshipSeason === undefined ||
      trackingSeason === sponsorshipSeason
    );
  });
}

function parseTitleAndSeason(title: string, fallback?: string) {
  const titleSeason = title.match(/\s+-\s*T(\d+)\s*$/i);
  const fallbackSeason = parseSeasonNumber(fallback);

  if (titleSeason) {
    return {
      title: cleanTitle(title.replace(/\s+-\s*T\d+\s*$/i, "")),
      seasonLabel: `Temp. ${titleSeason[1]}`,
    };
  }

  return {
    title,
    seasonLabel: fallbackSeason ? `Temp. ${fallbackSeason}` : undefined,
  };
}

function isSameContent(
  entry: Pick<ScheduleEntry, "title" | "seasonNumber">,
  item: Pick<Sponsorship, "title" | "season">,
) {
  const entryKey = normalizeKey(entry.title);
  const itemKey = normalizeKey(item.title);
  const itemSeasonNumber = parseSeasonNumber(item.season);
  const seasonMatches =
    entry.seasonNumber === undefined ||
    itemSeasonNumber === undefined ||
    entry.seasonNumber === itemSeasonNumber;

  if (!seasonMatches) return false;
  if (entryKey === itemKey) return true;

  return entryKey.includes(itemKey) || itemKey.includes(entryKey);
}

function makeSponsorshipId(
  category: SponsorshipCategory,
  title: string,
  season?: string,
) {
  return slugify(`${category}-${title}-${season ?? "unico"}`);
}

function makeScheduleId(
  date: string,
  column: number,
  rowIndex: number,
  rawTitle: string,
) {
  return slugify(`${date}-${column}-${rowIndex}-${rawTitle}`);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isWeekdayHeader(row: SheetRow) {
  const days = row.slice(0, 7).map((cell) => normalizeKey(cell));

  return days.includes("segunda feira") && days.includes("domingo");
}

function parseBrazilianDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  return `${match[3]}-${match[2]}-${match[1]}`;
}

function cleanScheduleTitle(value: string) {
  return cleanTitle(
    value.replace(/\([^)]*\)/g, "").replace(/\s+-\s*T\d+\s*$/i, ""),
  );
}

function parseEpisodesFromText(value: string) {
  const match = value.match(/\(([^)]*)\)/);
  if (!match) return [];

  return [...match[1].matchAll(/\d+/g)].map((item) => Number(item[0]));
}

function getContinuousWatchedEpisodes(values: string[]) {
  const episodes: number[] = [];

  for (const [index, value] of values.entries()) {
    if (!toBoolean(value)) break;
    episodes.push(index + 1);
  }

  return episodes;
}

function parseSeasonNumber(value?: string) {
  const match = value?.match(/(?:temp\.?|temporada|t)\s*\.?\s*(\d+)/i);

  return match ? Number(match[1]) : undefined;
}

function normalizeKey(value?: string) {
  return cleanTitle(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanTitle(value?: string) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeSearchTitle(title: string) {
  return title
    .replace(/\btemp\.?\s*\d+\b/gi, "")
    .replace(/\s+-\s*T\d+\s*$/gi, "")
    .replace(/\s+-\s+/g, " ")
    .trim();
}

function toBoolean(value?: string) {
  const normalized = value?.trim().toLowerCase();

  return normalized === "sim" || normalized === "true" || normalized === "yes";
}

function getStatus(started: boolean, finished: boolean): Sponsorship["status"] {
  if (finished) return "finalizado";
  if (started) return "em-andamento";

  return "nao-iniciado";
}

function statusRank(status: Sponsorship["status"]) {
  if (status === "em-andamento") return 0;
  if (status === "nao-iniciado") return 1;

  return 2;
}

async function enrichWithTmdb(items: Sponsorship[]) {
  const concurrency = 8;
  const enriched: Sponsorship[] = [];

  for (let index = 0; index < items.length; index += concurrency) {
    const slice = items.slice(index, index + concurrency);
    const results = await Promise.all(slice.map(enrichOne));
    enriched.push(...results);
  }

  return enriched;
}

async function enrichOne(item: Sponsorship): Promise<Sponsorship> {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) return item;

  const mediaType = item.category === "Filme" ? "movie" : "tv";

  try {
    const match = await searchTmdb(apiKey, mediaType, item.title);
    if (!match) return item;

    if (mediaType === "movie") {
      return enrichMovie(item, apiKey, match);
    }

    return enrichTv(item, apiKey, match);
  } catch {
    return item;
  }
}

async function searchTmdb(
  apiKey: string,
  mediaType: "movie" | "tv",
  title: string,
) {
  for (const query of getSearchQueries(title)) {
    const url = tmdbUrl(`search/${mediaType}`, apiKey);
    url.searchParams.set("query", query);
    url.searchParams.set("include_adult", "false");

    const response = await fetch(url, { next: { revalidate: 60 * 60 * 12 } });
    if (!response.ok) continue;

    const payload = (await response.json()) as { results?: TmdbSearchResult[] };
    const match = payload.results?.[0];

    if (match) return match;
  }
}

async function enrichMovie(
  item: Sponsorship,
  apiKey: string,
  match: TmdbSearchResult,
): Promise<Sponsorship> {
  const details = await fetchTmdb<TmdbMovieDetails>(
    `movie/${match.id}`,
    apiKey,
  );
  const source = details ?? match;
  const date = "release_date" in source ? source.release_date : match.release_date;

  return {
    ...item,
    tmdb: {
      id: match.id,
      title: source.title ?? match.title ?? item.title,
      originalTitle:
        "original_title" in source ? source.original_title : undefined,
      overview: source.overview ?? match.overview ?? "",
      posterUrl: imageUrl(source.poster_path ?? match.poster_path),
      backdropUrl: imageUrl(source.backdrop_path ?? match.backdrop_path),
      year: date ? date.slice(0, 4) : undefined,
      voteAverage: roundVote(source.vote_average ?? match.vote_average),
      mediaType: "movie",
      genres: details?.genres?.map((genre) => genre.name) ?? [],
      originalLanguage: details?.original_language,
      imdbId: details?.imdb_id ?? undefined,
      runtimeMinutes: details?.runtime ?? undefined,
      status: details?.status,
    },
  };
}

async function enrichTv(
  item: Sponsorship,
  apiKey: string,
  match: TmdbSearchResult,
): Promise<Sponsorship> {
  const details = await fetchTmdb<TmdbTvDetails>(
    `tv/${match.id}`,
    apiKey,
    "external_ids",
  );
  const seasonNumber = parseSeasonNumber(item.season) ?? 1;
  const seasonSummary = details?.seasons?.find(
    (season) => season.season_number === seasonNumber,
  );
  const seasonDetails = await fetchTmdb<TmdbSeasonResponse>(
    `tv/${match.id}/season/${seasonNumber}`,
    apiKey,
  );
  const season = seasonDetails
    ? normalizeSeasonDetails(seasonDetails, seasonSummary)
    : normalizeSeasonSummary(seasonSummary);
  const episodeTracking = normalizeEpisodeTracking(
    item.episodeTracking,
    season,
  );
  const date = details?.first_air_date ?? match.first_air_date;

  return {
    ...item,
    episodeTracking,
    tmdb: {
      id: match.id,
      title: details?.name ?? match.name ?? item.title,
      originalTitle: details?.original_name,
      overview: details?.overview ?? match.overview ?? "",
      posterUrl: imageUrl(details?.poster_path ?? match.poster_path),
      backdropUrl: imageUrl(details?.backdrop_path ?? match.backdrop_path),
      year: date ? date.slice(0, 4) : undefined,
      voteAverage: roundVote(details?.vote_average ?? match.vote_average),
      mediaType: "tv",
      genres: details?.genres?.map((genre) => genre.name) ?? [],
      originalLanguage: details?.original_language,
      imdbId: details?.external_ids?.imdb_id ?? undefined,
      status: details?.status,
      tv: {
        numberOfSeasons: details?.number_of_seasons,
        numberOfEpisodes: details?.number_of_episodes,
        episodeRunTime: details?.episode_run_time ?? [],
        season,
        seasonDetails: isSeasonDetails(season) ? season : undefined,
      },
    },
  };
}

async function fetchTmdb<T>(
  path: string,
  apiKey: string,
  appendToResponse?: string,
) {
  const url = tmdbUrl(path, apiKey);
  if (appendToResponse) {
    url.searchParams.set("append_to_response", appendToResponse);
  }

  const response = await fetch(url, { next: { revalidate: 60 * 60 * 12 } });
  if (!response.ok) return undefined;

  return (await response.json()) as T;
}

function tmdbUrl(path: string, apiKey: string) {
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "pt-BR");

  return url;
}

function normalizeSeasonSummary(
  season?: TmdbTvSeasonSummaryRaw,
): TmdbSeasonSummary | undefined {
  if (!season || season.season_number === undefined) return undefined;

  return {
    seasonNumber: season.season_number,
    name: season.name ?? `Temporada ${season.season_number}`,
    episodeCount: season.episode_count ?? 0,
    airDate: season.air_date,
    posterUrl: imageUrl(season.poster_path),
  };
}

function normalizeSeasonDetails(
  season: TmdbSeasonResponse,
  fallback?: TmdbTvSeasonSummaryRaw,
): TmdbSeasonDetails {
  const episodes =
    season.episodes?.map((episode) => ({
      episodeNumber: episode.episode_number ?? 0,
      name: episode.name ?? "",
      overview: episode.overview ?? "",
      airDate: episode.air_date,
      runtimeMinutes: episode.runtime ?? undefined,
      stillUrl: imageUrl(episode.still_path),
      voteAverage: roundVote(episode.vote_average),
    })) ?? [];
  const seasonNumber = season.season_number ?? fallback?.season_number ?? 1;

  return {
    seasonNumber,
    name: season.name ?? fallback?.name ?? `Temporada ${seasonNumber}`,
    overview: season.overview ?? "",
    episodeCount: episodes.length || fallback?.episode_count || 0,
    airDate: season.air_date ?? fallback?.air_date,
    posterUrl: imageUrl(season.poster_path ?? fallback?.poster_path),
    episodes,
  };
}

function normalizeEpisodeTracking(
  tracking: EpisodeTracking | undefined,
  season: TmdbSeasonSummary | TmdbSeasonDetails | undefined,
) {
  if (!tracking) return tracking;

  const totalEpisodes = season?.episodeCount || undefined;
  const remainingEpisodes =
    totalEpisodes !== undefined
      ? Math.max(totalEpisodes - tracking.watchedCount, 0)
      : undefined;
  const isCompleteByTmdb =
    totalEpisodes !== undefined && tracking.watchedCount >= totalEpisodes;
  const nextEpisode = isCompleteByTmdb ? undefined : tracking.nextEpisode;
  const nextEpisodeName =
    nextEpisode && isSeasonDetails(season)
      ? season.episodes.find((episode) => episode.episodeNumber === nextEpisode)
          ?.name
      : undefined;

  return {
    ...tracking,
    nextEpisode,
    totalEpisodes,
    remainingEpisodes,
    completionPercent:
      totalEpisodes !== undefined && totalEpisodes > 0
        ? Math.min(100, Math.round((tracking.watchedCount / totalEpisodes) * 100))
        : undefined,
    isCompleteByTmdb,
    nextEpisodeName,
  };
}

function isSeasonDetails(
  season: TmdbSeasonSummary | TmdbSeasonDetails | undefined,
): season is TmdbSeasonDetails {
  return Boolean(season && "episodes" in season);
}

function getSearchQueries(title: string) {
  const normalized = normalizeSearchTitle(title);
  const withoutTrailingOne = normalized.replace(/\s+1$/i, "");

  return [...new Set([normalized, withoutTrailingOne, title].filter(Boolean))];
}

function imageUrl(path?: string | null) {
  return path ? `${TMDB_IMAGE_BASE}${path}` : undefined;
}

function roundVote(value?: number) {
  return typeof value === "number" ? Number(value.toFixed(1)) : undefined;
}
