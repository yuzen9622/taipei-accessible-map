import AccessibleToolBar from "./AccessibleToolBar";
import SearchInput from "./SearchInput";
import AccountLogin from "./shared/AccountLogin";
import CategoryIndex from "./shared/CategoryIndex";

export default function MapWrapper() {
  return (
    <div className=" absolute inset-0 top-5  flex  w-11/12  justify-center pointer-events-none  mx-auto h-full">
      <CategoryIndex />
      <SearchInput />
      <AccountLogin />
      <AccessibleToolBar />
    </div>
  );
}
