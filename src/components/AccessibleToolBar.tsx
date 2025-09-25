import Image from "next/image";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import { A11yEnum } from "@/types/index";

export default function AccessibleToolBar() {
  const { selectedA11yTypes, toggleA11yType } = useMapStore();

  const toolbarItems = [
    {
      type: A11yEnum.RAMP,
      src: "/image/ramp.png",
      alt: "無障礙斜坡",
      label: "無障礙斜坡",
    },
    {
      type: A11yEnum.ELEVATOR,
      src: "/image/elevator.png",
      alt: "無障礙電梯",
      label: "無障礙電梯",
    },
    {
      type: A11yEnum.RESTROOM, // 如果你的 A11yEnum 沒有 restroom，需要加上
      src: "/image/restroom.png",
      alt: "無障礙廁所",
      label: "無障礙廁所",
    },
  ];

  return (
    <div className="absolute inset-5 top-18 w-fit h-fit flex flex-col space-y-2">
      {toolbarItems.map((item) => {
        const isSelected = selectedA11yTypes.includes(item.type);

        return (
          <button
            key={item.type}
            type="button"
            onClick={() => toggleA11yType(item.type)}
            className={cn(
              "flex flex-col group items-center gap-2 p-2 rounded-lg transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            )}
          >
            <Image
              src={item.src}
              alt={item.alt}
              className={cn(
                "rounded-md aspect-square object-cover transition-opacity"
              )}
              width={50}
              height={50}
            />
            <p
              className={cn(
                "text-xs group-hover:text-primary ",
                isSelected ? "text-primary-foreground" : "text-secondary"
              )}
            >
              {item.label}
            </p>
          </button>
        );
      })}
    </div>
  );
}
