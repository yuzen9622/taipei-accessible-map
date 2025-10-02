import Drawer from "@/components/ui/costume-drawer";
import useMapStore from "@/stores/useMapStore";
import { Card, CardContent, CardHeader } from "./ui/card";

export default function NavigationDrawer() {
  const { navigationDrawerOpen, setNavigationDrawerOpen } = useMapStore();

  return (
    <Drawer
      open={navigationDrawerOpen}
      onClose={() => setNavigationDrawerOpen(false)}
    >
      <Card>
        <CardHeader></CardHeader>
        <CardContent></CardContent>
      </Card>
    </Drawer>
  );
}
