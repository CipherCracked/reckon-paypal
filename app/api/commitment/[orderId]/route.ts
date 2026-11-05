import { computeCommitment } from "@/lib/commitment/compute";
import { findProduct } from "@/lib/catalog/products";
import { extractTerms } from "@/lib/ai/extract-terms";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const slug = new URL(request.url).searchParams.get("slug");
  const product = slug ? findProduct(slug) : undefined;

  if (!product) {
    return Response.json({ error: "Unknown product for this order." }, { status: 404 });
  }

  const translation = computeCommitment(product.terms);

  try {
    const terms = await extractTerms({ productText: product.description });
    return Response.json({
      orderId,
      shape: product.terms.shape,
      translation,
      labels: terms.labels,
      summary: terms.summary,
      degraded: false,
    });
  } catch {
    // The figures are computed locally from the order's own terms, so they are
    // still true when the model is unavailable. Only the wording is missing,
    // and the page says so rather than leaving a gap.
    return Response.json({
      orderId,
      shape: product.terms.shape,
      translation,
      labels: { item: product.name, shipping: "Shipping", tax: "Sales tax" },
      summary: "",
      degraded: true,
    });
  }
}
