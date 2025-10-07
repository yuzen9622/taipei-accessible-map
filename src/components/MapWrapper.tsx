import useMapStore from "@/stores/useMapStore";
import AccessibleToolBar from "./AccessibleToolBar";
import RoutePlanInput from "./PlanInput";
import SearchInput from "./SearchInput";
import AccountLogin from "./shared/AccountLogin";
import CategoryIndex from "./shared/CategoryIndex";

export default function MapWrapper() {
  const { selectRoute, infoShow, navigationDrawerOpen } = useMapStore();
  if (navigationDrawerOpen) return null;
  return (
    <div className="  fixed inset-2 z-50  top-5 space-y-2  flex flex-col    pointer-events-none  mx-auto h-full">
      <div className=" flex   flex-col  max-lg:items-start items-center lg:w-full lg:flex-row   ">
        <span className="flex h-fit items-center gap-2 w-full max-w-[450px] ">
          {selectRoute ? (
            <RoutePlanInput />
          ) : (
            <>
              <SearchInput /> <AccountLogin />
            </>
          )}
        </span>
        <span className="flex h-fit items-center gap-2 w-full max-w-[450px]">
          {!selectRoute && <AccessibleToolBar />}
        </span>
      </div>
    </div>
  );
}
