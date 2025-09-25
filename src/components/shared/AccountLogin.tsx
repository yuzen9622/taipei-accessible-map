"use client"

import React, { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "../ui/button"
import {
  User,
  Settings,
  HelpCircle,
  Moon,
  LogOut,
  Palette,
  Type,
  Globe,
  Info,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

export default function AccountLogin() {
  const [openDialog, setOpenDialog] = useState<null | "settings" | "feedback" | "help">(null)
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [feedbackText, setFeedbackText] = useState("")

  /** 新增語言、字體、主題顏色設定 */
  const [language, setLanguage] = useState("zh")
  const [fontSize, setFontSize] = useState("medium")
  const [themeColor, setThemeColor] = useState("#3b82f6") // 預設 Tailwind blue-500

  /** 模擬登入狀態 */
  const [loggedIn, setLoggedIn] = useState(false)
  const [userName, setUserName] = useState("使用者")

  /** 初始化 localStorage 設定 */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dark = localStorage.getItem("darkMode") === "true"
      const notify = localStorage.getItem("notifications") !== "false"
      const lang = localStorage.getItem("language") || "zh"
      const size = localStorage.getItem("fontSize") || "medium"
      const color = localStorage.getItem("themeColor") || "#3b82f6"
      setDarkMode(dark)
      setNotifications(notify)
      setLanguage(lang)
      setFontSize(size)
      setThemeColor(color)
    }
  }, [])

  /** dark mode */
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (darkMode) document.documentElement.classList.add("dark")
      else document.documentElement.classList.remove("dark")
      localStorage.setItem("darkMode", String(darkMode))
    }
  }, [darkMode])

  /** 字體大小 */
  useEffect(() => {
    document.documentElement.style.fontSize =
      fontSize === "small" ? "14px" : fontSize === "large" ? "18px" : "16px"
    localStorage.setItem("fontSize", fontSize)
  }, [fontSize])

  /** 主題顏色 */
  useEffect(() => {
    document.documentElement.style.setProperty("--theme-color", themeColor)
    localStorage.setItem("themeColor", themeColor)
  }, [themeColor])

  /** 語言 */
  useEffect(() => {
    localStorage.setItem("language", language)
  }, [language])

  const handleNotificationChange = (checked: boolean) => {
    setNotifications(checked)
    if (typeof window !== "undefined") localStorage.setItem("notifications", String(checked))
  }

  const handleSubmitFeedback = () => {
    console.log("送出問題回饋:", feedbackText)
    setFeedbackText("")
    setOpenDialog(null)
  }

  // 預設提供的色塊
  const themeColors = [
    "#3b82f6", // 藍
    "#ef4444", // 紅
    "#22c55e", // 綠
    "#f59e0b", // 橘
    "#8b5cf6", // 紫
    "#0f172a", // 深藍
  ]

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
                setLoggedIn(true)
                setUserName("測試使用者")
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

              <DropdownMenuItem
                onClick={() => setOpenDialog("help")}
                className="text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <Info className="mr-2 h-4 w-4" />
                使用說明
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
      <Dialog open={openDialog === "settings"} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">設定</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              調整偏好設定，例如深色模式、語言、字體大小與主題顏色。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 深色模式 */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Moon className="h-4 w-4" /> 深色模式
              </span>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            {/* 通知 */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">通知設定</span>
              <Switch checked={notifications} onCheckedChange={handleNotificationChange} />
            </div>

            {/* 語言 */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Globe className="h-4 w-4" /> 語言
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 border rounded-md p-1 text-sm"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* 字體大小 */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Type className="h-4 w-4" /> 字體大小
              </label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="mt-1 border rounded-md p-1 text-sm"
              >
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
            </div>

            {/* 主題顏色：改成色塊選擇 */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Palette className="h-4 w-4" /> 主題顏色
              </label>
              <div className="flex gap-2 mt-2">
                {themeColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setThemeColor(color)}
                    style={{ backgroundColor: color }}
                    className={`h-8 w-8 rounded-md border-2 ${
                      themeColor === color
                        ? "border-black dark:border-white"
                        : "border-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 問題回饋 Dialog */}
      {/* (保留你的程式碼不變) */}
    </>
  )
}
