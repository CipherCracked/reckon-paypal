import type { MarketProduct } from "@/lib/market/channel3";
import { money } from "@/lib/money";

/**
 * Four real listings, recorded from the live catalogue on 2026-11-10.
 *
 * The titles, descriptions and offer amounts are copied from the catalogue's
 * own answer; nothing here is written by us. Prices move, so these are test
 * fixtures, not the price the app will charge — the app reads the offer live.
 * The point of the recording is the merchant's words: a curated term may only
 * quote a sentence that actually appears in the record it was read from.
 */
export type RecordedListing = {
  id: string;
  title: string;
  description: string;
  domain: string;
  url: string;
  /** The offer's price today, in integer minor units. */
  priceMinor: number;
};

export const RECORDED_LISTINGS: Record<string, RecordedListing> = {
  YyLUjLT: {
    id: "YyLUjLT",
    title: "BARK 6 Month Subscription",
    description:
      "A subscription box for dogs that delivers themed toys, treats, and chews each month. This listing is for a 6 month BarkBox plan, featuring a curated assortment of soft plush toys, chew treats, and dog goodies designed for adult dogs. The product is a service-based, recurring subscription rather than a one-time physical product delivery.",
    domain: "bark.co",
    url: "https://buy.trychannel3.com/YyLUjLT-H2Gj-sOhX28?o=01KK9RK95ZRXFZXYN30TFRGMBR&aid=01M7329MSD95VYNQ1PYRA0QN3B",
    priceMinor: 2499,
  },
  omHxx9v: {
    id: "omHxx9v",
    title: "The Detox Box 6-Month Subscription",
    description:
      "The Detox Box 6-Month Subscription is a curated monthly beauty and wellness subscription from The Detox Market. Each month, subscribers receive a selection of handpicked, clean beauty 'holy grails' and game-changing discoveries designed to elevate self-care routines and improve skin appearance. The box is tailored for both curious beginners and seasoned clean beauty enthusiasts who want a consistent stream of top-tier, non-toxic products.",
    domain: "thedetoxmarket.com",
    url: "https://buy.trychannel3.com/omHxx9v-xmVR-sOhX28?o=01M2861DZKQR3PBBVNRQD5NTQN&aid=01M7329PKF4CT3B1K5GMKF4437",
    priceMinor: 5895,
  },
  DAaHyQc: {
    id: "DAaHyQc",
    title: "BARK 3 Month Subscription",
    description:
      "A BarkBox based subscription service offering monthly themed dog toys and treats. This page presents monthly, 3-month, 6-month, and 12-month BarkBox plans with automatic renewals and a 100% happiness guarantee. The product is a subscription service delivering a curated box of dog toys, treats, and activities each month.",
    domain: "bark.co",
    url: "https://buy.trychannel3.com/DAaHyQc-H2Gj-sOhX28?o=01KKPMX16P8VNDRAY7KZVDTZAV&aid=01M7329Q07S688Z96A1N7QSSJM",
    priceMinor: 2499,
  },
  zHpJR9Q: {
    id: "zHpJR9Q",
    title: "Bark Monthly Subscription",
    description:
      "A 12-month BarkBox subscription offering a free extra toy club for a year, featuring monthly BarkBox dog toys and treats. The page promotes a yearly subscription with optional add-ons and multiple plan durations, including 6 and 12 months, and highlights free extra toys for a year with certain plans.",
    domain: "bark.co",
    url: "https://buy.trychannel3.com/zHpJR9Q-H2Gj-sOhX28?o=01KK4JDF8DJQNPBCFTF350XEF8&aid=01M7329QD0AR7AVXD7MJ0V2NJK",
    priceMinor: 4400,
  },
};

/** The same record in the shape `readMarketProduct` returns. */
export function recordedProduct(id: string): MarketProduct {
  const listing = RECORDED_LISTINGS[id];
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    brand: null,
    image: null,
    rating: null,
    offers: [
      {
        domain: listing.domain,
        url: listing.url,
        price: money(listing.priceMinor),
        compareAt: null,
        availability: "InStock",
      },
    ],
  };
}
