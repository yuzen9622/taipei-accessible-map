import { useEffect, useState } from "react";

import { Drawer } from "./ui/drawer";

type DrawerWrapperProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapPoints?: (string | number)[];
  children: React.ReactNode;
};

export default function DrawerWrapper({
  children,
  open,
  snapPoints = ["500px", 1],
  onOpenChange,
}: DrawerWrapperProps) {
  const [direction, setDirection] = useState<
    "left" | "right" | "top" | "bottom"
  >("bottom");
  const [snapTo, setSnapTo] = useState<string | number | null>(snapPoints[0]);

  useEffect(() => {
    const observer = new ResizeObserver((el) => {
      el.forEach((e) => {
        if (e.contentRect.width > 1024) {
          setDirection("left");
          setSnapTo(1);
        } else {
          setDirection("bottom");
          setSnapTo(snapPoints[0]);
        }
      });
    });
    observer.observe(document.body);
    return () => {
      observer.disconnect();
    };
  }, [snapPoints]);
  return (
    <Drawer
      key={direction}
      modal={false}
      dismissible={direction === "bottom"}
      open={open}
      direction={direction}
      snapPoints={direction === "bottom" ? snapPoints : [2]}
      activeSnapPoint={snapTo}
      setActiveSnapPoint={setSnapTo}
      onOpenChange={onOpenChange}
      onClose={() => onOpenChange(false)}
    >
      {children}
    </Drawer>
  );
}
