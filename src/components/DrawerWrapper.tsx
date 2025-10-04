import { memo, useEffect, useState } from "react";

import Drawer from "@/components/ui/costume-drawer";

type DrawerWrapperProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placement?: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
};

const DrawerWrapper = memo(function DrawerWrapper({
  children,
  open,
  placement,
  onOpenChange,
}: DrawerWrapperProps) {
  const [direction, setDirection] = useState<
    "left" | "right" | "top" | "bottom"
  >("bottom");

  useEffect(() => {
    const observer = new ResizeObserver((el) => {
      el.forEach((e) => {
        if (e.contentRect.width > 1024) {
          setDirection("left");
        } else {
          setDirection("bottom");
        }
      });
    });
    observer.observe(document.body);
    return () => {
      observer.disconnect();
    };
  }, []);
  return (
    <Drawer
      key={direction}
      placement={placement || direction}
      open={open}
      onClose={() => onOpenChange(false)}
    >
      {children}
    </Drawer>
  );
});
DrawerWrapper.displayName = "DrawerWrapper";
export default DrawerWrapper;
