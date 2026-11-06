import { ConsentScreen } from "@/components/ConsentScreen";

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ slug?: string; approved?: string; cancelled?: string; token?: string }>;
};

export default async function ConsentPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { slug, approved, cancelled, token } = await searchParams;

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Before you agree</p>
        <h1>Check what you are taking on</h1>
      </header>
      <ConsentScreen
        orderId={token ?? orderId}
        slug={slug ?? ""}
        // PayPal sends the shopper back with ?approved=1&token=<order id>
        // once they have approved the payment.
        returning={approved === "1"}
        cancelled={cancelled === "1"}
      />
    </main>
  );
}
