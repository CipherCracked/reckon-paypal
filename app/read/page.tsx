"use client";

import { useEffect, useRef, useState } from "react";
import { BackLink } from "@/components/BackLink";
import { CommitmentView } from "@/components/CommitmentView";
import { DisplayControls } from "@/components/DisplayControls";
import { ReadAloud } from "@/components/ReadAloud";
import {
  DEFAULT_PREFERENCES,
  readPreferences,
  writePreferences,
  type Preferences,
} from "@/lib/preferences";
import { formatMoney } from "@/lib/money";
import type { RenderedFigure } from "@/lib/commitment/present";
import type { FigureId } from "@/lib/commitment/present";
import type { CommitmentBreakdown } from "@/lib/commitment/types";
import { formatReadingDate } from "@/lib/document/read";
import { absentFigureNote, describeSources } from "@/lib/commitment/sources";

type ReadResponse = {
  mode: "read";
  summary: string;
  figures: RenderedFigure[];
  breakdown: CommitmentBreakdown;
  notes: Partial<Record<FigureId, string>>;
  sources: Partial<Record<FigureId, string | null>>;
  schedule: string;
  dueDate: string | null;
  quotationCount: number;
  rejected: number;
};

type CandidatesResponse = {
  mode: "candidates";
  notice: string;
  candidates: { amounts: string[]; dates: string[] };
};

type ReadResult = ReadResponse | CandidatesResponse;

const SOURCE_LABELS: Record<FigureId, string> = {
  acrossTerm: "Across the term",
  exit: "Cost to leave",
  today: "Charged today",
};

const FIGURE_IDS: FigureId[] = ["acrossTerm", "exit", "today"];

export default function ReadPage() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "done" | "failed">("idle");
  const [result, setResult] = useState<ReadResult | null>(null);
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Preferences belong to the reader's browser and are read after mount, so the
  // first paint is the accessible default rather than a flash of someone else's
  // saved size (IPD 10).
  useEffect(() => {
    setPreferences(readPreferences());
  }, []);

  // The figures arrive inside the live region, but the region also holds the
  // controls; moving focus to it puts the reader at the start of the answer
  // instead of leaving them on a button that has already done its job.
  useEffect(() => {
    if (status === "done") resultsRef.current?.focus();
  }, [status]);

  function updatePreferences(next: Preferences) {
    setPreferences(next);
    writePreferences(next);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("reading");
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = (await response.json()) as ReadResult | { error?: string };

      if (!response.ok) {
        setStatus("failed");
        setError("error" in body && body.error ? body.error : "This document could not be read.");
        return;
      }

      setResult(body as ReadResult);
      setStatus("done");
    } catch {
      setStatus("failed");
      setError("The reading service could not be reached. Nothing was sent and nothing was kept.");
    }
  }

  function startAgain() {
    setResult(null);
    setStatus("idle");
    setError("");
    setText("");
  }

  return (
    <div className="page">
      <BackLink href="/">Back to the ways in</BackLink>

      <header className="page-header">
        <p className="eyebrow">A document</p>
        <h1>Paste what someone sent you</h1>
        <p className="lede">
          A bill, a contract, a payment plan — anything you were asked to agree to. You get the same
          three figures: what it costs across the whole term, what it costs to leave, and what is
          charged first. Every figure shows the sentence it came from.
        </p>
      </header>

      <form className="read-form" onSubmit={submit}>
        <label htmlFor="document">
          The document
          <span className="visually-hidden"> — paste the text you were sent</span>
        </label>
        <textarea
          id="document"
          name="document"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          aria-describedby="document-hint"
        />
        <p id="document-hint" className="field-hint">
          Nothing you paste is stored or logged. It is sent once to the model that picks out the
          sentences, and the model is only allowed to copy them — it is never asked what anything
          costs.
        </p>
        <button type="submit" className="button-primary" disabled={status === "reading"}>
          {status === "reading" ? "Reading…" : "Read this document"}
        </button>
        {status === "failed" ? (
          <p className="notice" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {result && status === "done" ? (
        <div
          ref={resultsRef}
          tabIndex={-1}
          role="region"
          aria-label="What this document asks of you"
          data-text-scale={preferences.textScale}
        >
          {result.mode === "read" ? (
            <ReadResultPanel
              result={result}
              preferences={preferences}
              onPreferences={updatePreferences}
              onReset={startAgain}
            />
          ) : (
            <CandidatesPanel result={result} onReset={startAgain} />
          )}
        </div>
      ) : null}
    </div>
  );
}

function ReadResultPanel({
  result,
  preferences,
  onPreferences,
  onReset,
}: {
  result: ReadResponse;
  preferences: Preferences;
  onPreferences: (next: Preferences) => void;
  onReset: () => void;
}) {
  const schedule = result.dueDate
    ? `Due ${formatReadingDate(result.dueDate)} — the date the document states. ${result.schedule}`
    : result.schedule;

  return (
    <>
      <p className="notice" role="status">
        Read {result.quotationCount} sentence{result.quotationCount === 1 ? "" : "s"} from your
        document. Each figure below was worked out by this page from the sentence shown beside it —
        not by the model.
        {result.rejected > 0
          ? ` ${result.rejected} sentence${result.rejected === 1 ? "" : "s"} the model offered could not be found in your text and ${result.rejected === 1 ? "was" : "were"} discarded.`
          : ""}
      </p>

      <CommitmentView
        figures={result.figures}
        breakdown={result.breakdown}
        labels={{ item: "The amount the document states", shipping: "Charged once on top", tax: "Tax" }}
        summary={result.summary}
        schedule={schedule}
        figureNotes={result.notes}
        progressive={preferences.progressive}
        sourceNote={describeSources({
          published: "the sentence beside each figure, which is quoted from your document",
          absent: absentFigureNote(result.figures),
        })}
      />

      <div className="consent-adjust">
        <DisplayControls
          textScale={preferences.textScale}
          progressive={preferences.progressive}
          onTextScale={(textScale) => onPreferences({ ...preferences, textScale })}
          onProgressive={(progressive) => onPreferences({ ...preferences, progressive })}
        />
        <ReadAloud text={spokenText(result, schedule)} />
      </div>

      <section className="read-sources" aria-labelledby="sources-heading">
        <h3 id="sources-heading">Where each figure came from</h3>
        <dl>
          {FIGURE_IDS.map((id) => (
            <div key={id} data-source={id}>
              <dt>{SOURCE_LABELS[id]}</dt>
              <dd>
                {result.sources[id] ? (
                  <q>{result.sources[id]}</q>
                ) : (
                  <span className="commitment-hint">The document does not state this.</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <button type="button" className="button-secondary" onClick={onReset}>
        Read a different document
      </button>
    </>
  );
}

/** What the browser reads out: the figures in the order they are shown, then the schedule. */
function spokenText(result: ReadResponse, schedule: string): string {
  const parts = result.figures.map((figure) =>
    figure.amount === null
      ? `${figure.label}: not stated by this document.`
      : `${figure.label}: ${formatMoney(figure.amount)}.`,
  );
  return [...parts, schedule].join(" ");
}

function CandidatesPanel({ result, onReset }: { result: CandidatesResponse; onReset: () => void }) {
  return (
    <>
      {/* The limit is stated before the amounts, not after them (ITD 12). */}
      <p className="notice" role="status">
        {result.notice}
      </p>

      <section aria-labelledby="candidates-heading">
        <h2 id="candidates-heading">Amounts written in your document</h2>
        {result.candidates.amounts.length > 0 ? (
          <ul className="candidate-list">
            {result.candidates.amounts.map((amount) => (
              <li key={amount} data-candidate="amount">
                {amount}
              </li>
            ))}
          </ul>
        ) : (
          <p>No amounts were found in the text at all.</p>
        )}

        {result.candidates.dates.length > 0 ? (
          <>
            <h3>Dates written in your document</h3>
            <ul className="candidate-list">
              {result.candidates.dates.map((date) => (
                <li key={date} data-candidate="date">
                  {date}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <p className="commitment-source">
          These are copied from your document. This page has not worked out what any of them means,
          so none of them is a total and none of them is labelled as one.
        </p>
      </section>

      <button type="button" className="button-secondary" onClick={onReset}>
        Try a different document
      </button>
    </>
  );
}
