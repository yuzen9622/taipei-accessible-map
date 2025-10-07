import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import useNavigation from "@/hook/useNavigation";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import DrawerWrapper from "./DrawerWrapper";
import SafeInstruction from "./shared/StepInstruction";
import { Button } from "./ui/button";
import { Card, CardAction, CardContent, CardHeader } from "./ui/card";
export default function NavigationDrawer() {
  const { navigationDrawerOpen } = useMapStore();
  const { currentStep, prevStep, nextStep, stopNavigation } = useNavigation();

  if (!currentStep) return null;
  return (
    <>
      <Card
        className={cn(
          "fixed top-0 inset-2 h-fit rounded-3xl  max-w-[450px] z-20",
          navigationDrawerOpen ? "flex" : "hidden"
        )}
      >
        <CardHeader className="flex items-center flex-1 gap-4  ">
          {currentStep.step.maneuver && (
            <div className="adp-substep   scale-150">
              <div className="adp-stepicon">
                <span
                  className={`adp-${currentStep.step.maneuver} adp-maneuver `}
                ></span>
              </div>
            </div>
          )}
          {currentStep.step.transit && (
            <Image
              src={currentStep.step.transit.line.vehicle.icon}
              alt={currentStep.step.transit.line.name}
              width={30}
              height={30}
            />
          )}
          <div className="   space-x-2 space-y-1">
            <SafeInstruction
              className="font-bold text-base lg:text-lg "
              html={currentStep.title}
            />
            <SafeInstruction
              className="space-x-2  text-xs lg:text-sm font-bold text-muted-foreground "
              html={currentStep?.step.instructions}
            />
          </div>
        </CardHeader>
      </Card>
      <DrawerWrapper size={200} open={navigationDrawerOpen}>
        <div className="p-1">
          <CardContent className=" flex  lg:flex-row flex-col  justify-between">
            <span className="flex items-center font-bold  gap-2 shrink-0">
              <h1 className="text-lg">{currentStep.step.duration?.text}</h1>
              <p className="text-sm text-muted-foreground font-bold">
                {currentStep.step.distance?.text}
              </p>
            </span>

            <CardAction className=" flex  p-1  justify-between bg-muted w-full lg:w-fit rounded-3xl  shrink-0">
              <span className="flex gap-1 items-center">
                <Button onClick={prevStep} variant={"ghost"}>
                  <ChevronLeft />
                </Button>
                <Button onClick={nextStep} variant={"ghost"}>
                  <ChevronRight />
                </Button>
              </span>

              <Button
                variant={"destructive"}
                onClick={stopNavigation}
                className="rounded-3xl"
              >
                結束
              </Button>
            </CardAction>
          </CardContent>
        </div>
      </DrawerWrapper>
    </>
  );
}
