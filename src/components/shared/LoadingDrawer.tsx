import { Loader2Icon } from "lucide-react";

export default function LoadingDrawer() {
  return (
    <div className="w-full lg:h-[calc(100dvh-12em)] h-[150px] flex items-center justify-center">
      <Loader2Icon className="animate-spin" />
    </div>
  );
}
