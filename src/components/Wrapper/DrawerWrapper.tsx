import type { DrawerProps } from "@rc-component/drawer";

import { memo, useEffect, useState } from "react";
import Drawer from "@/components/ui/costume-drawer";

type DrawerWrapperProps = {
  children: React.ReactNode;
} & DrawerProps;

const DrawerWrapper = memo(function DrawerWrapper({
  children,
  open,
  placement,
  zIndex,
  ...props
}: DrawerWrapperProps) {
  const [direction, setDirection] = useState<
    "left" | "right" | "top" | "bottom"
  >("bottom");

  useEffect(() => {
    const observer = new ResizeObserver((el) => {
      el.forEach((e) => {
        if (e.contentRect.width > 767) {
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
      zIndex={zIndex || 10}
      {...props}
    >
      {children}
    </Drawer>
  );
});
DrawerWrapper.displayName = "DrawerWrapper";
export default DrawerWrapper;
