"use client";

import { HelpCircle, LogOut, Moon, Settings, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "../ui/button";

export default function AccountLogin() {
  const [openDialog, setOpenDialog] = useState<null | "settings" | "feedback">(
    null
  );
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [feedbackText, setFeedbackText] = useState("");

  /** 模擬登入狀態 */
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("使用者");

  /** 初始化 localStorage 設定 */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dark = localStorage.getItem("darkMode") === "true";
      const notify = localStorage.getItem("notifications") !== "false";
      setDarkMode(dark);
      setNotifications(notify);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (darkMode) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", String(darkMode));
    }
  }, [darkMode]);

  const handleNotificationChange = (checked: boolean) => {
    setNotifications(checked);
    if (typeof window !== "undefined")
      localStorage.setItem("notifications", String(checked));
  };

  const handleSubmitFeedback = () => {
    console.log("送出問題回饋:", feedbackText);
    setFeedbackText("");
    setOpenDialog(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 focus:ring-2 focus:ring-white rounded-full transition-colors duration-200"
          >
            <User className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2">
          <DropdownMenuLabel className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {loggedIn ? userName : "未登入"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {!loggedIn && (
            <DropdownMenuItem
              className="text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              onClick={() => {
                setLoggedIn(true);
                setUserName("測試使用者");
              }}
            >
              模擬登入
            </DropdownMenuItem>
          )}

          {loggedIn && (
            <>
              <DropdownMenuItem
                onClick={() => setOpenDialog("settings")}
                className="text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <Settings className="mr-2 h-4 w-4" />
                設定
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setOpenDialog("feedback")}
                className="text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                問題回饋
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setLoggedIn(false)}
                className="text-sm text-red-500 hover:text-red-600 rounded-md"
              >
                <LogOut className="mr-2 h-4 w-4" />
                登出
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 設定 Dialog */}
      <Dialog
        open={openDialog === "settings"}
        onOpenChange={() => setOpenDialog(null)}
      >
        <DialogContent className="max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">設定</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              調整偏好設定，例如深色模式與通知。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Moon className="h-4 w-4" /> 深色模式
              </span>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                通知設定
              </span>
              <Switch
                checked={notifications}
                onCheckedChange={handleNotificationChange}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 問題回饋 Dialog */}
      <Dialog
        open={openDialog === "feedback"}
        onOpenChange={() => setOpenDialog(null)}
      >
        <DialogContent className="max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              問題回饋
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              請描述您遇到的問題或建議，我們將盡快改善！
            </DialogDescription>
          </DialogHeader>

          <textarea
            className="w-full border rounded-md p-2 text-sm mt-4"
            rows={4}
            placeholder="請輸入您的意見..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <Button
            className="w-full mt-2 text-sm"
            onClick={handleSubmitFeedback}
          >
            送出
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
