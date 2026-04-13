import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl space-y-10">
        <div>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            &larr; Back to home
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Privacy Promise
          </h1>
        </div>

        <section className="space-y-4 text-zinc-300 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            No backend. No database. No analytics. No tracking.
          </h2>
          <p>
            InstagramWrapped is a fully static website. There are no servers
            processing your data, no databases storing it, no analytics
            tracking your usage, and no third-party scripts watching what you
            do.
          </p>
        </section>

        <section className="space-y-4 text-zinc-300 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            Everything happens in your browser
          </h2>
          <p>
            When you upload your Instagram export ZIP, it is unzipped and
            parsed entirely inside a{" "}
            <span className="font-medium text-white">Web Worker</span> running
            in your browser tab. The JSON files are read, the interactions are
            normalized, and the insights are computed — all client-side. The
            ZIP file is never uploaded to any server.
          </p>
        </section>

        <section className="space-y-4 text-zinc-300 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            Refresh to erase
          </h2>
          <p>
            Your parsed data lives in browser memory only (a{" "}
            <span className="font-medium text-white">Zustand</span> store with
            no persistence middleware). There is no localStorage, no
            sessionStorage, no IndexedDB, no cookies. Refresh the page and
            every trace of your data is gone. You can verify this by reading
            the source code — the store is about 30 lines.
          </p>
        </section>

        <section className="space-y-4 text-zinc-300 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            The share button
          </h2>
          <p>
            When you click &ldquo;Share&rdquo; on a story card, the card is
            rendered to a PNG image using{" "}
            <span className="font-medium text-white">html-to-image</span>.
            The image is offered to your device&apos;s native share sheet (on
            mobile) or downloaded directly (on desktop). The image is never
            uploaded to our servers because we don&apos;t have servers.
          </p>
        </section>

        <section className="space-y-4 text-zinc-300 leading-relaxed">
          <h2 className="text-xl font-semibold text-white">
            Open source
          </h2>
          <p>
            The entire codebase is available for inspection. If you want to
            verify any of the claims on this page, read the source. The
            privacy guarantee is enforced by architecture, not by policy.
          </p>
        </section>

        <div className="border-t border-zinc-800 pt-8">
          <Link
            href="/"
            className="text-sm font-medium text-pink-400 underline underline-offset-4 hover:text-pink-300"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
