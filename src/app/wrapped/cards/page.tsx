"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUploadStore } from "@/model/store";
import {
  REGISTERED,
  availableYears,
  parseScope,
  runRegistry,
} from "@/modules";
import { buildDeck } from "@/cards/buildDeck";
import { StoryDeck } from "@/cards/StoryDeck";

export default function CardsPage() {
  return (
    <Suspense fallback={<DeckLoading />}>
      <DeckContent />
    </Suspense>
  );
}

function DeckContent() {
  const bundle = useUploadStore((s) => s.bundle);
  const paths = useUploadStore((s) => s.paths);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Routing guard — same pattern as /wrapped.
  useEffect(() => {
    if (!bundle) router.replace("/upload");
  }, [bundle, router]);

  const cards = useMemo(() => {
    if (!bundle) return [];
    const years = availableYears(bundle.interactions);
    const scope = parseScope(searchParams.get("year"), years);
    const runs = runRegistry(bundle, paths, scope, REGISTERED);
    return buildDeck(runs);
  }, [bundle, paths, searchParams]);

  if (!bundle) return null;

  return <StoryDeck cards={cards} />;
}

function DeckLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
      Loading…
    </main>
  );
}
