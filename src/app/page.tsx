import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Hero />
      <HowItWorks />
      <PrivacyPromise />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section className="flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
      <div className="inline-block rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-1 text-xs font-semibold uppercase tracking-widest">
        Privacy-first
      </div>
      <h1 className="mt-6 max-w-3xl text-5xl font-black leading-tight tracking-tight sm:text-7xl">
        Your Instagram,{" "}
        <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          Wrapped
        </span>
      </h1>
      <p className="mt-6 max-w-lg text-lg text-zinc-400">
        Breakdown of your Instagram data. Swipeable story cards, real insights,
        shareable PNGs. Everything runs in your browser and your data never
        leaves your device. If you don't trust it then you can run the source
        code yourself. https://github.com/edwardsungswe/InstagramWrapped
      </p>
      <div className="mt-10">
        <Link
          href="/upload"
          className="rounded-full bg-white px-8 py-4 text-base font-bold text-black transition-transform hover:scale-105"
        >
          Upload your export
        </Link>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "1",
      title: "Export your data",
      desc: "Go to Instagram Settings, then Accounts Center, then Download Your Information. Choose JSON format.",
    },
    {
      num: "2",
      title: "Drop the ZIP here",
      desc: "Upload the ZIP file to this site. JSZip extracts and parses it entirely in your browser.",
    },
    {
      num: "3",
      title: "See your Wrapped",
      desc: "Swipe through your story cards — top people, personality type, activity heatmap, and more.",
    },
  ];

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <h2 className="text-center text-3xl font-bold tracking-tight">
        How it works
      </h2>
      <div className="mt-12 grid gap-8 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.num} className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-lg font-bold">
              {step.num}
            </div>
            <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-zinc-400">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PrivacyPromise() {
  return (
    <section className="border-t border-zinc-800 px-6 py-24 text-center">
      <h2 className="text-3xl font-bold tracking-tight">
        Your data stays yours
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-zinc-400">
        There is no backend, no database, no analytics, and no tracking. The ZIP
        is unzipped and parsed entirely in a Web Worker in your browser. Refresh
        the page and every trace is gone.
      </p>
      <Link
        href="/privacy"
        className="mt-6 inline-block text-sm font-medium text-pink-400 underline underline-offset-4 hover:text-pink-300"
      >
        Read the full privacy promise
      </Link>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-800 px-6 py-8 text-center text-xs text-zinc-500">
      <p>
        InstagramWrapped is not affiliated with Instagram or Meta. Your data is
        processed entirely in your browser.
      </p>
    </footer>
  );
}
