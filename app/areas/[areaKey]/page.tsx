import ClientView from "./ClientView";

type Params = { areaKey?: string };

export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  const p = await params;
  return <ClientView areaKey={p.areaKey ?? "slums"} />;
}