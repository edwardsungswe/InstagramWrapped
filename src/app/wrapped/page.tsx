"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { useUploadStore } from "@/model/store";
import {
  REGISTERED,
  availableYears,
  parseScope,
  runRegistry,
  type ModuleRun,
  type TimeScope,
} from "@/modules";
import type { TopPeopleResult } from "@/modules/topPeople";
import type { ActivityHeatmapResult } from "@/modules/activityHeatmap";
import type { PersonalityTypeResult } from "@/modules/personalityType";
import type { YearSummaryResult } from "@/modules/yearSummary";
import { countByKind } from "@/parsing/parse";
import type { ParsedBundle } from "@/model/events";

const KIND_LABELS: Array<{
  key: keyof ReturnType<typeof countByKind>;
  label: string;
}> = [
  { key: "dm_sent", label: "DMs sent" },
  { key: "dm_received", label: "DMs received" },
  { key: "like", label: "Likes" },
  { key: "view", label: "Posts viewed" },
  { key: "comment", label: "Comments" },
  { key: "follow", label: "Follows" },
  { key: "story_like", label: "Story likes" },
  { key: "save", label: "Saves" },
  { key: "search", label: "Searches" },
];

export default function WrappedPage() {
  return (
    <Suspense fallback={<WrappedLoading />}>
      <WrappedContent />
    </Suspense>
  );
}

function WrappedContent() {
  const bundle = useUploadStore((s) => s.bundle);
  const paths = useUploadStore((s) => s.paths);
  const fileCount = useUploadStore((s) => s.fileCount);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Routing guard: if there's no bundle in the store (refresh, direct visit),
  // bounce to the upload page. We render `null` for the brief flash before
  // the redirect commits.
  useEffect(() => {
    if (!bundle) router.replace("/upload");
  }, [bundle, router]);

  if (!bundle) return null;

  const years = availableYears(bundle.interactions);
  const scope = parseScope(searchParams.get("year"), years);

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-2xl space-y-10">
        <Header bundle={bundle} fileCount={fileCount} />
        <YearPicker years={years} active={scope} />
        <PlayDeckButton scope={scope} />
        <Breakdown bundle={bundle} />
        <Sidecars bundle={bundle} />
        {bundle.errors.length > 0 && <ErrorBanner bundle={bundle} />}
        <ModuleList bundle={bundle} paths={paths} scope={scope} />
        <FooterActions />
      </div>
    </main>
  );
}

function PlayDeckButton({ scope }: { scope: TimeScope }) {
  const router = useRouter();
  const href =
    scope.kind === "year"
      ? `/wrapped/cards?year=${scope.year}`
      : "/wrapped/cards";
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => router.push(href)}
        className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-pink-500/30 transition-transform hover:scale-105"
      >
        <span className="text-2xl">▶</span>
        <span>Play your Wrapped</span>
      </button>
    </div>
  );
}

function WrappedLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
      Loading…
    </main>
  );
}

function Header({
  bundle,
  fileCount,
}: {
  bundle: ParsedBundle;
  fileCount: number;
}) {
  const owner = bundle.account.owner;
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold tracking-tight">Your Wrapped</h1>
      <p className="mt-2 text-zinc-400">
        {owner.displayName ? (
          <>
            Hi <span className="font-medium text-white">{owner.displayName}</span>
            {owner.handle ? <> (@{owner.handle})</> : null} —{" "}
          </>
        ) : null}
        parsed{" "}
        <span className="font-medium text-white">
          {fileCount.toLocaleString()} files
        </span>{" "}
        from your{" "}
        <span className="font-medium text-white">
          {bundle.account.type} account
        </span>
        .
      </p>
    </div>
  );
}

function YearPicker({
  years,
  active,
}: {
  years: number[];
  active: TimeScope;
}) {
  const router = useRouter();
  const setYear = (year: number | null) => {
    const url = year === null ? "/wrapped" : `/wrapped?year=${year}`;
    router.replace(url, { scroll: false });
  };

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Pill
        label="All time"
        active={active.kind === "all"}
        onClick={() => setYear(null)}
      />
      {years.map((y) => (
        <Pill
          key={y}
          label={String(y)}
          active={active.kind === "year" && active.year === y}
          onClick={() => setYear(y)}
        />
      ))}
    </div>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full border px-4 py-1.5 text-sm transition-colors",
        active
          ? "border-white bg-white text-black"
          : "border-zinc-700 text-zinc-300 hover:border-zinc-500",
      )}
    >
      {label}
    </button>
  );
}

function Breakdown({ bundle }: { bundle: ParsedBundle }) {
  const counts = countByKind(bundle.interactions);
  const total = bundle.interactions.length;
  return (
    <div>
      <p className="text-center text-3xl font-bold">
        {total.toLocaleString()} interactions
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {KIND_LABELS.map(({ key, label }) => (
          <li
            key={key}
            className="flex justify-between border-b border-zinc-800 py-1"
          >
            <span className="text-zinc-400">{label}</span>
            <span className="font-mono text-white">
              {counts[key].toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sidecars({ bundle }: { bundle: ParsedBundle }) {
  return (
    <div className="grid grid-cols-3 gap-4 text-center text-sm">
      <Sidecar label="Profile changes" value={bundle.profileChanges.length} />
      <Sidecar label="Login events" value={bundle.logins.length} />
      <Sidecar label="Ad interests" value={bundle.adInterests.length} />
    </div>
  );
}

function Sidecar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-zinc-800 p-3">
      <div className="text-xl font-semibold">{value.toLocaleString()}</div>
      <div className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function ErrorBanner({ bundle }: { bundle: ParsedBundle }) {
  return (
    <div className="rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-300">
      {bundle.errors.length} source(s) failed to parse:{" "}
      {bundle.errors.map((e) => e.source).join(", ")}
    </div>
  );
}

function ModuleList({
  bundle,
  paths,
  scope,
}: {
  bundle: ParsedBundle;
  paths: string[];
  scope: TimeScope;
}) {
  const runs = useMemo(
    () => runRegistry(bundle, paths, scope, REGISTERED),
    [bundle, paths, scope],
  );

  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-widest text-zinc-500">
        Insights · {scope.kind === "all" ? "all time" : scope.year}
      </p>
      <ul className="space-y-2">
        {runs.map((run) => (
          <ModuleRow key={run.module.id} run={run} />
        ))}
      </ul>
    </div>
  );
}

function ModuleRow({ run }: { run: ModuleRun }) {
  const { module, result } = run;
  return (
    <li className="rounded border border-zinc-800 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{module.title}</span>
        <StatusPill status={result.status} />
      </div>
      {result.status === "skipped" && (
        <p className="mt-1 text-xs text-zinc-500">{result.reason}</p>
      )}
      {result.status === "error" && (
        <p className="mt-1 text-xs text-red-400">{result.error}</p>
      )}
      {result.status === "ok" && (
        <ModuleData id={module.id} data={result.data} />
      )}
    </li>
  );
}

/**
 * Phase 5 inline renderer dispatch. Switches on `module.id` to call the
 * matching renderer for the module's typed `data`. Phase 6 replaces this
 * whole section with the swipeable story-card UI.
 */
function ModuleData({ id, data }: { id: string; data: unknown }) {
  switch (id) {
    case "top-people":
      return <TopPeopleData data={data as TopPeopleResult} />;
    case "activity-heatmap":
      return <ActivityHeatmapData data={data as ActivityHeatmapResult} />;
    case "personality-type":
      return <PersonalityTypeData data={data as PersonalityTypeResult} />;
    case "year-summary":
      return <YearSummaryData data={data as YearSummaryResult} />;
    default:
      return null;
  }
}

function TopPeopleData({ data }: { data: TopPeopleResult }) {
  if (data.people.length === 0) {
    return (
      <p className="mt-2 text-xs text-zinc-500">
        No one cleared the {data.threshold}-point threshold.
      </p>
    );
  }
  return (
    <ol className="mt-3 space-y-1 text-sm">
      {data.people.map((p, idx) => (
        <li
          key={p.handle}
          className="flex items-baseline justify-between gap-3"
        >
          <span>
            <span className="mr-2 inline-block w-5 text-right text-zinc-500">
              {idx + 1}.
            </span>
            <span className="font-medium">@{p.handle}</span>
          </span>
          <span className="font-mono text-xs text-zinc-500">
            {Math.round(p.score)} pts
            <span className="ml-2 text-zinc-600">
              ({p.breakdown.dmSent}↑/{p.breakdown.dmReceived}↓ DMs ·{" "}
              {p.breakdown.likes} ♥)
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function ActivityHeatmapData({ data }: { data: ActivityHeatmapResult }) {
  if (data.activeDayCount === 0) {
    return (
      <p className="mt-2 text-xs text-zinc-500">
        No activity in this scope.
      </p>
    );
  }
  return (
    <p className="mt-2 text-sm text-zinc-400">
      Active <span className="font-medium text-white">{data.activeDayCount}</span>{" "}
      days · peak{" "}
      <span className="font-medium text-white">{data.maxCount}</span>{" "}
      interactions on a single day · {data.startDay} → {data.endDay}
    </p>
  );
}

function PersonalityTypeData({ data }: { data: PersonalityTypeResult }) {
  return (
    <div className="mt-3 space-y-3">
      <p className="text-lg font-semibold">{data.label}</p>
      <p className="text-sm text-zinc-400">{data.description}</p>
      <div className="space-y-1.5">
        <AxisBar label="Social" value={data.axes.social} />
        <AxisBar label="Lurker" value={data.axes.lurker} />
        <AxisBar label="Creator" value={data.axes.creator} />
        <AxisBar label="Explorer" value={data.axes.explorer} />
      </div>
    </div>
  );
}

function AxisBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-16 text-zinc-400">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-1.5 bg-pink-400"
          style={{ width: `${Math.round(value)}%` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-zinc-500">
        {Math.round(value)}%
      </span>
    </div>
  );
}

function YearSummaryData({ data }: { data: YearSummaryResult }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <div>
        <dt className="text-xs uppercase tracking-wider text-zinc-500">
          Total interactions
        </dt>
        <dd className="font-mono">
          {data.totalInteractions.toLocaleString()}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wider text-zinc-500">
          Most active month
        </dt>
        <dd className="font-mono">
          {data.mostActiveMonth
            ? `${data.mostActiveMonth.label} (${data.mostActiveMonth.count})`
            : "—"}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wider text-zinc-500">
          Peak day
        </dt>
        <dd className="font-mono">
          {data.peakDay
            ? `${data.peakDay.date} (${data.peakDay.count})`
            : "—"}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wider text-zinc-500">
          Longest DM streak
        </dt>
        <dd className="font-mono">
          {data.longestDmStreak.days > 0
            ? `${data.longestDmStreak.days} days`
            : "—"}
        </dd>
      </div>
    </dl>
  );
}

function StatusPill({ status }: { status: "ok" | "skipped" | "error" }) {
  const styles = {
    ok: "bg-emerald-900/40 text-emerald-300 border-emerald-800",
    skipped: "bg-zinc-800 text-zinc-400 border-zinc-700",
    error: "bg-red-900/40 text-red-300 border-red-800",
  } as const;
  return (
    <span
      className={clsx(
        "rounded-full border px-2 py-0.5 text-xs uppercase tracking-wider",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function FooterActions() {
  const router = useRouter();
  const clear = useUploadStore((s) => s.clear);
  return (
    <div className="text-center">
      <button
        type="button"
        onClick={() => {
          clear();
          router.push("/upload");
        }}
        className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
      >
        Upload another
      </button>
    </div>
  );
}
