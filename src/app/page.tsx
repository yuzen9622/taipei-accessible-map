import ClientMap from "@/components/ClientMap";
import InfoDrawer from "@/components/InfoDrawer";
import RouteDrawer from "@/components/RouteDrawer";

export default function Home() {
  return (
    <div>
      <ClientMap />
      <InfoDrawer />
      <RouteDrawer />
    </div>
  );
}
