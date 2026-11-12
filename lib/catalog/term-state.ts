import type { TermState } from "./resolve";

/**
 * What a route says when a listing has no schedule to charge on (IPD 40).
 *
 * The product page draws five states; a route has no screen, so it says the same
 * facts in words. Four routes charge money from one resolution, and a shopper
 * should not meet four different explanations of one refusal — so the sentences
 * live here, beside the state they explain.
 *
 * Every one of them says that nothing was charged. These are the paths that move
 * money, and a refusal that read like a failure could be mistaken for a charge
 * that half happened.
 */
export function noScheduleSentence(state: TermState): string {
  switch (state.kind) {
    case "notRead":
      return "This listing's words have not been read yet, so this purchase cannot be started. Nothing has been charged.";
    case "unreadable":
      return "This listing's words could not be read, so this purchase cannot be started. Nothing has been charged.";
    case "unschedulable":
      return state.reason === "cadence"
        ? "This listing states a term whose charges are not monthly, and this page can only schedule monthly charges. Nothing has been charged."
        : "This listing states its term in a unit this page cannot charge in. Nothing has been charged.";
    case "ongoing":
      return "This listing describes a subscription with no end, so there is no total to agree to. Nothing has been charged.";
    // A schedule exists, so a route should never be asking. The sentence is a
    // guard rather than a case: it says nothing about the seller that could be
    // wrong, and it still refuses rather than spending money it was not asked to.
    case "structured":
    case "stated":
    case "silent":
      return "No schedule could be built for this listing, so this purchase cannot be started. Nothing has been charged.";
  }
}
