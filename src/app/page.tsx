import ClientMap from "@/components/ClientMap";
import RoutePlanInput from "@/components/PlanInput";

export default function Home() {
  return (
    <div className=" w-full h-full flex flex-col">
      <RoutePlanInput />

      <ClientMap />
    </div>
  );
}
