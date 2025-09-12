import { Loader2Icon } from "lucide-react";

import { DrawerTitle } from "../ui/drawer";

export default function LoadingDrawer() {
  return (
    <DrawerTitle className="w-full h-full flex items-center justify-center">
      <Loader2Icon className="animate-spin" />
    </DrawerTitle>
  );
}
