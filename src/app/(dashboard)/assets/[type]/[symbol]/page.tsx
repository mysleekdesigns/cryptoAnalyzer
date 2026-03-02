export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ type: string; symbol: string }>;
}) {
  const { type, symbol } = await params;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {type}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{symbol}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Asset details coming soon
      </p>
    </div>
  );
}
