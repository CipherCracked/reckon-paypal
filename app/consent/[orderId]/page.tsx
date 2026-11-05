import { ConsentScreen } from "@/components/ConsentScreen";

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ slug?: string }>;
};

export default async function ConsentPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { slug } = await searchParams;

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Before you agree</p>
        <h1>Check what you are taking on</h1>
      </header>
      <ConsentScreen orderId={orderId} slug={slug ?? ""} />
    </main>
  );
}
