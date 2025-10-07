import useMapStore from "@/stores/useMapStore";
import AccessibleToolBar from "./AccessibleToolBar";
import RoutePlanInput from "./PlanInput";
import SearchInput from "./SearchInput";
import AccountLogin from "./shared/AccountLogin";

export default function MapWrapper() {
  const { selectRoute, navigationDrawerOpen } = useMapStore();
  if (navigationDrawerOpen) return null;
  return (
    <div className="  fixed inset-2 z-50  top-5 space-y-2  flex flex-col    pointer-events-none  mx-auto h-full">
      <div className=" flex   flex-col  justify-between max-w-[450px] items-center lg:w-full lg:flex-row gap-2 ">
        <span className="flex h-fit items-center gap-2 w-11/12">
          {selectRoute ? (
            <RoutePlanInput />
          ) : (
            <>
              <SearchInput /> <AccountLogin />
            </>
          )}
        </span>
        <span className="flex gap-4 flex-col w-11/12  justify-center">
          {!selectRoute && <AccessibleToolBar />}
        </span>
      </div>
    </div>
  );
}
