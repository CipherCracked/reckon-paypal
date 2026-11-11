"use client";

import { useEffect, useRef, useState } from "react";
import { BillDoor } from "@/components/BillDoor";
import { CommitmentView } from "@/components/CommitmentView";
import { ExitNav, RECORD_EXITS } from "@/components/ExitNav";
import { Page } from "@/components/Page";
import { PaceControl } from "@/components/PaceControl";
import { findBill } from "@/lib/catalog/bills";
import { computeCommitment } from "@/lib/commitment/compute";
import { DEFAULT_PREFERENCES, readPreferences, savePreference } from "@/lib/preferences";
import { exampleDocuments, type ExampleDocument } from "@/lib/catalog/examples";
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

export default function ReadPage() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "done" | "failed">("idle");
  const [result, setResult] = useState<ReadResult | null>(null);
  const [error, setError] = useState("");
  // Which example is being read, so the button that was pressed is the one that
  // says so rather than all four saying "Reading…".
  const [readingExample, setReadingExample] = useState<string | null>(null);
  // The text size is the frame's (IPD 24); this page owns only the pacing.
  const [progressive, setProgressive] = useState(DEFAULT_PREFERENCES.progressive);
  const resultsRef = useRef<HTMLDivElement>(null);
  // The one commitment PayPal issues rather than a seller describing it. Read
  // from the catalogue file, which is a constant in this repository.
  const bill = findBill("clinic-visit");

  // Preferences belong to the reader's browser and are read after mount, so the
  // first paint is the accessible default rather than a flash of someone else's
  // saved size (IPD 10).
  useEffect(() => {
    setProgressive(readPreferences().progressive);
  }, []);

  // The figures arrive inside the live region, but the region also holds the
  // controls; moving focus to it puts the reader at the start of the answer
  // instead of leaving them on a button that has already done its job.
  useEffect(() => {
    if (status !== "done") return;
    // Focus moves to the answer, and the answer is brought into view with it:
    // the result can sit below a screen of form, and an answer nobody scrolls
    // to is an answer nobody reads.
    resultsRef.current?.scrollIntoView?.({ block: "start" });
    resultsRef.current?.focus();
  }, [status]);

  function updateProgressive(next: boolean) {
    setProgressive(next);
    // Merged with what is stored, so a pacing choice here cannot overwrite a
    // text size chosen in the frame (IPD 24).
    savePreference("progressive", next);
  }

  /** The one path to a reading, whether the text was typed or an example's. */
  async function runReading(value: string) {
    setStatus("reading");
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
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
    } finally {
      setReadingExample(null);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void runReading(text);
  }

  /** An example fills the box and starts the reading, so the click is the whole visit (IPD 22). */
  function startExample(example: ExampleDocument) {
    setText(example.text);
    setReadingExample(example.slug);
    void runReading(example.text);
  }

  function startAgain() {
    setResult(null);
    setStatus("idle");
    setError("");
    setText("");
  }

  return (
    <Page
      back={{ href: "/", label: "Back to the start" }}
      eyebrow="A document"
      title="Paste what someone sent you"
      lede="A bill, a contract, a payment plan — anything you were asked to agree to. You get the same three figures: what it costs across the whole term, what it costs to leave, and what is charged first. Every figure shows the sentence — or the arithmetic — it came from."
    >

      {/* The examples come first because they are the demonstration; the box
          stays empty and stays the visitor's own way in. */}
      <section className="examples" aria-labelledby="examples-heading">
        <h2 id="examples-heading">Or start from one of these</h2>
        <p className="field-hint">
          Examples, written for this page. None of them is a real seller and none of them is yours.
          Their readings were made when the server started, so a click answers at once — and if one
          has to be read now, the button says so and the wait is a minute.
        </p>
        <ul className="example-list">
          {exampleDocuments.map((example) => (
            <li
              key={example.slug}
              className="example"
              data-example={example.slug}
              data-refused={example.refused ? "true" : undefined}
            >
              <button
                type="button"
                className="button-secondary"
                onClick={() => startExample(example)}
                disabled={status === "reading"}
                aria-describedby={`example-note-${example.slug}`}
              >
                {readingExample === example.slug && status === "reading"
                  ? "Reading…"
                  : example.label}
              </button>
              <span id={`example-note-${example.slug}`} className="example-note">
                {example.note}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* A click that changes nothing visible is a click that gets clicked
          again. This says the reading started, where the click happened, while
          the result is still being prepared further down the page. */}
      {status === "reading" ? (
        <p className="notice" role="status">
          Reading this document now. The figures will appear below the box.
        </p>
      ) : null}

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
          placeholder="Paste the text you were sent here."
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

      {/* A bill is the one commitment this page cannot read from a paste — it
          is issued by PayPal, not described by a seller. It was a peer door on
          the entry, which made three identical tiles behave three different
          ways; it is a line here, next to the other third-party document
          (IPD 28). */}
      {bill ? (
        <section className="bill-offer" aria-labelledby="bill-offer-heading">
          <h2 id="bill-offer-heading">Or ask PayPal to issue a bill</h2>
          <p className="field-hint">
            This creates a real invoice in PayPal&apos;s sandbox and then reads it back here, so
            the screen you get is built from PayPal&apos;s own copy rather than from this page.
          </p>
          <div className="bill-offer-list">
            <BillDoor
              slug={bill.slug}
              name={bill.name}
              biller={bill.biller}
              amount={formatMoney(computeCommitment(bill.terms).today)}
            />
          </div>
        </section>
      ) : null}

      {result && status === "done" ? (
        <div
          ref={resultsRef}
          tabIndex={-1}
          role="region"
          aria-label="What this document asks of you"
        >
          {result.mode === "read" ? (
            <ReadResultPanel
              result={result}
              progressive={progressive}
              onProgressive={updateProgressive}
              onReset={startAgain}
            />
          ) : (
            <CandidatesPanel result={result} onReset={startAgain} />
          )}
        </div>
      ) : null}
    </Page>
  );
}

function ReadResultPanel({
  result,
  progressive,
  onProgressive,
  onReset,
}: {
  result: ReadResponse;
  progressive: boolean;
  onProgressive: (progressive: boolean) => void;
  onReset: () => void;
}) {
  const schedule = result.dueDate
    ? `Due ${formatReadingDate(result.dueDate)} — the date the document states. ${result.schedule}`
    : result.schedule;

  return (
    <>
      <p className="notice" role="status">
        Took {result.quotationCount} quotation{result.quotationCount === 1 ? "" : "s"} from your
        document, each checked word for word against your text. Each figure below was worked out
        by this page from the sentence shown beside it — not by the model.
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
        progressive={progressive}
        sourceNote={describeSources({
          published: "the sentence beside each figure, which is quoted from your document",
          absent: absentFigureNote(result.figures),
        })}
      />

      <div className="consent-adjust">
        <PaceControl progressive={progressive} onProgressive={onProgressive} />
      </div>

      <button type="button" className="button-secondary" onClick={onReset}>
        Read a different document
      </button>

      <ExitNav links={RECORD_EXITS} />
    </>
  );
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

      <ExitNav links={RECORD_EXITS} />
    </>
  );
}
