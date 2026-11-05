import { formatMoney } from "@/lib/money";
import type { CommitmentTranslation } from "@/lib/commitment/types";

export type CommitmentViewProps = {
  translation: CommitmentTranslation;
  labels: { item: string; shipping: string; tax: string };
  summary: string;
};

export function CommitmentView({ translation, labels, summary }: CommitmentViewProps) {
  return (
    <section className="commitment" aria-labelledby="commitment-heading">
      <h2 id="commitment-heading">What this commitment asks of you</h2>

      {summary ? <p className="commitment-summary">{summary}</p> : null}

      <dl className="commitment-figures">
        <div className="commitment-figure">
          <dt>Charged today</dt>
          <dd>{formatMoney(translation.today)}</dd>
        </div>
        <div className="commitment-figure">
          <dt>Across the term</dt>
          <dd>{formatMoney(translation.acrossTerm)}</dd>
        </div>
        <div className="commitment-figure">
          <dt>Cost to leave</dt>
          <dd>
            {translation.exit === null ? (
              <>
                Not stated
                <span className="commitment-hint">
                  This seller has not published what it costs to cancel.
                </span>
              </>
            ) : (
              formatMoney(translation.exit)
            )}
          </dd>
        </div>
      </dl>

      <h3 id="commitment-breakdown-heading" tabIndex={-1}>
        Where these figures come from
      </h3>
      <dl className="commitment-breakdown">
        <div>
          <dt>{labels.item}</dt>
          <dd>{formatMoney(translation.breakdown.item)}</dd>
        </div>
        <div>
          <dt>{labels.shipping}</dt>
          <dd>{formatMoney(translation.breakdown.shipping)}</dd>
        </div>
        <div>
          <dt>{labels.tax}</dt>
          <dd>{formatMoney(translation.breakdown.tax)}</dd>
        </div>
      </dl>

      <p className="commitment-source">
        Figures calculated from the PayPal order for this purchase. This page gives you no advice
        about whether to buy.
      </p>
    </section>
  );
}
