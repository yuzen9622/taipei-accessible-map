import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <div className="w-full flex  py-5 px-3 items-center  justify-between  bg-sidebar">
      <h1 className="text-xl font-bold">無障礙台北 - Accessible Taipei</h1>

      <div>
        <Button variant={"ghost"}>登入</Button>
      </div>
    </div>
  );
}
