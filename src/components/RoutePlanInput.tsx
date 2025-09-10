import SearchInput from "./SearchInput";

export default function RoutePlanInput({
  onDestinationPlace,
  onOriginPlace,
}: {
  onDestinationPlace: (places: google.maps.places.Place) => void;
  onOriginPlace: (places: google.maps.places.Place) => void;
}) {
  return (
    <div className=" absolute inset-5 h-fit w-full mx-auto max-w-10/12">
      <span className=" relative w-full  flex max-lg:flex-col  rounded-2xl items-center bg-background gap-2">
        <SearchInput
          className="ring-1"
          placeholder="起始點"
          onPlaceSelect={onOriginPlace}
        />
        <SearchInput placeholder="終點" onPlaceSelect={onDestinationPlace} />
      </span>
    </div>
  );
}
