/* eslint-disable @typescript-eslint/no-unused-vars */

import Drawer from "@rc-component/drawer";
import { cn } from "@/lib/utils";
import "rc-drawer/assets/index.css"; // 重要：導入樣式

const CostumeDrawer = ({
  open,
  onClose,
  children,
  placement = "left",
}: {
  open: boolean;
  placement?: "left" | "right" | "top" | "bottom";
  onClose: () => void;
  children: React.ReactNode;
}) => {
  return (
    <Drawer
      open={open}
      rootClassName={cn("z-10!")}
      onClose={onClose}
      afterOpenChange={(c: boolean) => {
        console.log("transitionEnd: ", c);
      }}
      placement={placement}
      size={placement === "bottom" || placement === "top" ? "50%" : 460}
      mask={false}
      className="h-full w-full  flex items-end p-2"
      classNames={{
        wrapper: cn("w-full ", placement === "bottom" && "bottom-0"),
      }}
      getContainer={() => document.body}
    >
      <div
        className={cn(
          " pointer-events-auto lg:h-[calc(100vh-10rem)] h-full rounded-3xl  w-full overflow-y-auto overflow-x-hidden bg-background shadow-xl"
        )}
      >
        {children}
      </div>
    </Drawer>
  );
};
export default CostumeDrawer;
