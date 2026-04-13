"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { Card } from "./types";
import { YearSummaryCard } from "./YearSummaryCard";
import { TopPeopleCard } from "./TopPeopleCard";
import { PersonalityCard } from "./PersonalityCard";
import { HeatmapCard } from "./HeatmapCard";
import { RelationshipInsightsCard } from "./RelationshipInsightsCard";
import { ContentCategoriesCard } from "./ContentCategoriesCard";
import { AdPersonalityCard } from "./AdPersonalityCard";
import { RedFlagsCard } from "./RedFlagsCard";
import { GreenFlagsCard } from "./GreenFlagsCard";
import { TimelineEvolutionCard } from "./TimelineEvolutionCard";
import { DeviceLocationsCard } from "./DeviceLocationsCard";
import { CardErrorBoundary } from "./CardErrorBoundary";
import { shareCard } from "./share";

/**
 * Spotify-Wrapped-style swipeable story-card carousel.
 *
 * Navigation:
 *   - Swipe / drag (Framer Motion)
 *   - Tap left third / right two-thirds (Instagram Stories pattern)
 *   - Arrow keys + Space (forward) and Escape (exit)
 *
 * Each card snapshot is captured by `share.ts` via the visible card's
 * forwarded ref.
 */
export function StoryDeck({ cards }: { cards: Card[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const exit = () => router.push("/wrapped");

  const next = () =>
    setIndex((i) => (i + 1 < cards.length ? i + 1 : i));
  const prev = () => setIndex((i) => (i > 0 ? i - 1 : i));

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        exit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // Stable handlers; no deps needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cards.length === 0) return <EmptyDeck onExit={exit} />;

  const card = cards[index];

  const handleShare = async () => {
    if (!cardRef.current) return;
    await shareCard(cardRef.current, `instagram-wrapped-${card.id}.png`);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <ProgressBar count={cards.length} index={index} />

      <div className="flex items-center justify-between px-5 pt-12 pb-2">
        <button
          type="button"
          onClick={exit}
          className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Exit deck"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
        >
          Share
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        {/* Tap zones — sit BEHIND the card so the card's own pointer events
            (drag/click) take priority but empty space still navigates. */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous card"
          className="absolute inset-y-0 left-0 z-0 w-1/3"
        />
        <button
          type="button"
          onClick={next}
          aria-label="Next card"
          className="absolute inset-y-0 right-0 z-0 w-2/3"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={card.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) next();
              else if (info.offset.x > 50) prev();
            }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            <CardErrorBoundary cardId={card.id}>
              <CardRenderer card={card} cardRef={cardRef} />
            </CardErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function CardRenderer({
  card,
  cardRef,
}: {
  card: Card;
  cardRef: React.Ref<HTMLDivElement>;
}) {
  switch (card.id) {
    case "year-summary":
      return <YearSummaryCard ref={cardRef} card={card} />;
    case "timeline-evolution":
      return <TimelineEvolutionCard ref={cardRef} card={card} />;
    case "top-people":
      return <TopPeopleCard ref={cardRef} card={card} />;
    case "relationship-insights":
      return <RelationshipInsightsCard ref={cardRef} card={card} />;
    case "personality-type":
      return <PersonalityCard ref={cardRef} card={card} />;
    case "red-flags":
      return <RedFlagsCard ref={cardRef} card={card} />;
    case "green-flags":
      return <GreenFlagsCard ref={cardRef} card={card} />;
    case "content-categories":
      return <ContentCategoriesCard ref={cardRef} card={card} />;
    case "device-locations":
      return <DeviceLocationsCard ref={cardRef} card={card} />;
    case "ad-personality":
      return <AdPersonalityCard ref={cardRef} card={card} />;
    case "activity-heatmap":
      return <HeatmapCard ref={cardRef} card={card} />;
  }
}

function ProgressBar({ count, index }: { count: number; index: number }) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
        >
          <div
            className={clsx(
              "h-full bg-white transition-all duration-300",
              i < index && "w-full",
              i === index && "w-1/2",
              i > index && "w-0",
            )}
          />
        </div>
      ))}
    </div>
  );
}

function EmptyDeck({ onExit }: { onExit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
      <h2 className="text-3xl font-bold">Not enough data yet</h2>
      <p className="max-w-sm text-zinc-400">
        Your export doesn&apos;t have the activity needed to build a deck.
        Try with a different export, or come back after using Instagram a bit
        more.
      </p>
      <button
        type="button"
        onClick={onExit}
        className="rounded-full border border-zinc-700 px-5 py-2 text-sm hover:border-zinc-500"
      >
        ← Back
      </button>
    </div>
  );
}
