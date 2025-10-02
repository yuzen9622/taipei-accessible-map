import AccessibleToolBar from "./AccessibleToolBar";

import SearchInput from "./SearchInput";
import AccountLogin from "./shared/AccountLogin";
import CategoryIndex from "./shared/CategoryIndex";

export default function MapWrapper() {
  return (
    <div className="  fixed inset-2 z-50  top-5 space-y-2  flex flex-col    pointer-events-none  mx-auto h-full">
      <div>
        <div className=" flex    justify-between ">
          <span className="flex h-fit items-center w-[450px]">
            <CategoryIndex />
            <SearchInput />
          </span>
          <span className="flex gap-4 flex-col w-fit items-center">
            <AccountLogin />
            <AccessibleToolBar />
          </span>
        </div>
      </div>
    </div>
  );
}
