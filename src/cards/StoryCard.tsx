import { forwardRef, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Base layout for every story card.
 *
 * - Phone aspect ratio (9:16) so the share PNG looks like an Instagram story
 * - Full-bleed gradient background passed in via the `bg` prop
 * - Forwarded ref so `share.ts` can snapshot the rendered card
 * - Children fill the card via flex column
 *
 * The card has rounded corners and is centered in the viewport. On a phone
 * in portrait it nearly fills the screen; on desktop it shows letterboxed
 * against the deck's black background.
 */
export const StoryCard = forwardRef<HTMLDivElement, {
  bg: string;
  children: ReactNode;
}>(function StoryCard({ bg, children }, ref) {
  return (
    <div
      ref={ref}
      className={clsx(
        "flex aspect-[9/16] w-[min(90vw,28rem)] flex-col rounded-3xl p-8 text-white shadow-2xl",
        bg,
      )}
    >
      {children}
    </div>
  );
});
