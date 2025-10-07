"use client";

import { useGoogleLogin } from "@react-oauth/google";

import {
  Globe,
  HelpCircle,
  Info,
  LogOut,
  Moon,
  Palette,
  Settings,
  Type,
  User,
} from "lucide-react";
import { useState } from "react";
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
import { login } from "@/lib/api/auth";
import {
  ColorEnum,
  colorThemeConfig,
  type FontSizeEnum,
  fontSizeConfig,
  LanguageConfig,
  type LanguageEnum,
} from "@/lib/config";
import { cn } from "@/lib/utils";
import useAuthStore from "@/stores/useAuthStore";

import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";

export default function AccountLogin() {
  const [openDialog, setOpenDialog] = useState<
    null | "settings" | "feedback" | "help"
  >(null);

  const [feedbackText, setFeedbackText] = useState("");

  // 預設提供的色塊
  const themeColors = [
    {
      type: ColorEnum.Default,
    },
    {
      type: ColorEnum.Red,
    },
    {
      type: ColorEnum.Blue,
    },
    {
      type: ColorEnum.Green,
    },
    {
      type: ColorEnum.Purple,
    },
    {
      type: ColorEnum.Orange,
    },
    {
      type: ColorEnum.Yellow,
    },
  ];
  const { user, setUser, setSession, userConfig, setUserConfig } =
    useAuthStore();

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfo = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        );
        const infoData = await userInfo.json();

        setUser({
          name: infoData.name,
          email: infoData.email,
          avatar: infoData.picture,
          client_id: infoData.sub,
        });
        const userRes = await login(
          infoData.email,
          infoData.name,
          infoData.picture,
          infoData.sub,
        );

        const { ok, data, message, accessToken } = userRes;
        if (!ok) throw new Error(message);

        if (data?.user) setUser(data.user);
        if (accessToken) {
          setSession({
            accessToken,
          });
        }
      } catch (error) {
        console.log("Google 登入失敗", error);
      }
    },
    onError: (errorResponse) => console.log(errorResponse),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-white  focus:ring-2  bg-blue-500  relative pointer-events-auto  focus:ring-white rounded-full transition-colors duration-200"
          >
            <User className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2">
          <DropdownMenuLabel className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {user ? `歡迎，${user.name}` : "請先登入"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {!user && (
            <DropdownMenuItem
              className="text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              onClick={() => {
                googleLogin();
              }}
            >
              Google 登入
            </DropdownMenuItem>
          )}

          {
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

              <DropdownMenuItem className="text-sm text-red-500 hover:text-red-600 rounded-md">
                <LogOut className="mr-2 h-4 w-4" />
                登出
              </DropdownMenuItem>
            </>
          }
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
              調整偏好設定，例如深色模式、語言、字體大小與主題顏色。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 深色模式 */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Moon className="h-4 w-4" /> 深色模式
              </span>
              <Switch />
            </div>

            {/* 通知 */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                通知設定
              </span>
              <Switch />
            </div>

            {/* 語言 */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Globe className="h-4 w-4" /> 語言
                <Select>
                  <SelectTrigger>
                    {LanguageConfig[userConfig.language].label}
                  </SelectTrigger>

                  <SelectContent>
                    {Object.entries(LanguageConfig).map(([key, config]) => (
                      <SelectItem
                        key={key}
                        value={key}
                        onClick={() =>
                          setUserConfig({
                            language: key as LanguageEnum,
                          })
                        }
                      >
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </span>
            </div>

            {/* 字體大小 */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Type className="h-4 w-4" /> 字體大小
                <Select
                  onValueChange={(v) =>
                    setUserConfig({
                      fontSize: v as FontSizeEnum,
                    })
                  }
                  defaultValue={userConfig.fontSize}
                >
                  <SelectTrigger className="mt-1 border rounded-md p-1 text-sm">
                    {fontSizeConfig[userConfig.fontSize].label}
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(fontSizeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </span>
            </div>

            {/* 主題顏色：改成色塊選擇 */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Palette className="h-4 w-4" /> 主題顏色
              </span>
              <div className="flex gap-2 mt-2">
                {themeColors.map((color) => (
                  <Button
                    variant={"outline"}
                    type="button"
                    key={color.type}
                    onClick={() => setUserConfig({ themeColor: color.type })}
                    style={{
                      backgroundColor: colorThemeConfig[color.type].primary,
                    }}
                    className={cn(
                      `h-8 w-8 rounded-md `,

                      userConfig.themeColor === color.type &&
                        " ring-2  ring-offset-1 ring-ring ",
                    )}
                  />
                ))}
              </div>
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
          <Button className="w-full mt-2 text-sm">送出</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
