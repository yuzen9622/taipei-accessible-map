import SosTrackingView from "@/components/Sos/SosTrackingView";

export default async function SosTrackingPage({
  params,
}: {
  params: Promise<{ lng: string; shareToken: string }>;
}) {
  const { shareToken } = await params;
  return <SosTrackingView shareToken={shareToken} />;
}
