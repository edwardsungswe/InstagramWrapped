"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { runExtraction } from "@/parsing/workerClient";
import { useUploadStore } from "@/model/store";

type UiState =
  | { kind: "idle" }
  | { kind: "working"; fileName: string }
  | { kind: "error"; message: string };

export default function UploadPage() {
  const router = useRouter();
  const setBundle = useUploadStore((s) => s.setBundle);
  const [state, setState] = useState<UiState>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setState({
          kind: "error",
          message: `That doesn't look like a ZIP file (got "${file.name}").`,
        });
        return;
      }
      setState({ kind: "working", fileName: file.name });
      const result = await runExtraction(file);
      if (result.status === "ok") {
        setBundle({
          bundle: result.bundle,
          paths: result.paths,
          fileCount: result.fileCount,
          fileName: file.name,
        });
        router.push("/wrapped");
      } else {
        setState({ kind: "error", message: result.message });
      }
    },
    [router, setBundle],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const reset = () => {
    setState({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16 text-white">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Upload your export</h1>
        <p className="mt-3 text-zinc-400">
          Drop your Instagram data export ZIP. Everything is parsed in your
          browser — your data never leaves your device.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            "mt-10 cursor-pointer rounded-2xl border-2 border-dashed px-8 py-16 transition-colors",
            dragging
              ? "border-pink-400 bg-pink-500/10"
              : "border-zinc-700 hover:border-zinc-500",
          )}
        >
          <p className="text-lg font-medium">
            {dragging ? "Drop it" : "Drag a ZIP here, or click to browse"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Settings → Accounts Center → Export Your Information → JSON
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={onInputChange}
          />
        </div>

        <div className="mt-8 min-h-[3rem]" aria-live="polite">
          {state.kind === "working" && (
            <div className="flex flex-col items-center gap-3">
              <svg
                className="h-8 w-8 animate-spin text-pink-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-zinc-300">
                Parsing{" "}
                <span className="font-mono">{state.fileName}</span>
              </p>
              <p className="text-xs text-zinc-500 animate-pulse">
                Extracting ZIP and computing insights in your browser...
              </p>
            </div>
          )}
          {state.kind === "error" && (
            <div className="space-y-3">
              <p className="text-red-400">Something went wrong: {state.message}</p>
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
