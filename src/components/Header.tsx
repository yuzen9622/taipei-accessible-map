import { Button } from "@/components/ui/button"; 
import { Menu, User } from "lucide-react";
import AccountLogin from "./shared/AccountLogin";

export default function Header() {
  return (
    <header className="w-full  box-border  text-white  p-3">
      <div className="flex items-center justify-between rounded-2xl py-4 px-6 shadow-md  bg-blue-800">
        
        {/* 左邊 - Menu Icon */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 focus:ring-2 focus:ring-white rounded-full transition-colors duration-200"
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* 中間 - 標題 */}
        <h1 className="text-lg md:text-xl font-bold text-center flex-1">
          無障礙台北 - Accessible Taipei
        </h1>

        {/* 右邊 - User Icon */}
        <AccountLogin/>
      </div>
    </header>
  );
}
