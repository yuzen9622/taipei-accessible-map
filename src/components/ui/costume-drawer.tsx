/* eslint-disable @typescript-eslint/no-unused-vars */

import Drawer, { type DrawerProps } from "@rc-component/drawer";
import { cn } from "@/lib/utils";
import "rc-drawer/assets/index.css"; // 重要：導入樣式

const CostumeDrawer = ({
  open,
  onClose,
  children,
  placement = "left",
  size = "50%",
  zIndex,
}: {
  children: React.ReactNode;
} & DrawerProps) => {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      afterOpenChange={(c: boolean) => {
        console.log("transitionEnd: ", c);
      }}
      zIndex={zIndex}
      placement={placement}
      size={placement === "bottom" || placement === "top" ? size : 460}
      mask={false}
      className="h-full w-full  flex items-end overflow-hidden p-2"
      classNames={{
        wrapper: cn("w-full ", placement === "bottom" && "bottom-0"),
      }}
      getContainer={() => document.body}
    >
      <div
        className={cn(
          " relative flex flex-col pointer-events-auto lg:max-h-[calc(100dvh-12em)] sm:max-h-1/2 max-h-full h-fit  rounded-3xl  w-full overflow-y-hidden overflow-x-hidden bg-background shadow-xl"
        )}
      >
        {children}
      </div>
    </Drawer>
  );
};
export default CostumeDrawer;
