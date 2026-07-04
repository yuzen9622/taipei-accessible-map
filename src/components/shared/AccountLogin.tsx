"use client";

import { useGoogleLogin } from "@react-oauth/google";

import {
  Contrast,
  Globe,
  Info,
  LogOut,
  Settings,
  Type,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
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
import { useAppTranslation } from "@/i18n/client";
import { login } from "@/lib/api/auth";
import {
  type FontSizeEnum,
  fontSizeConfig,
  LanguageConfig,
  type LanguageEnum,
} from "@/lib/config";
import useAuthStore from "@/stores/useAuthStore";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { ThemeSwitcher } from "../ui/shadcn-io/theme-switcher";

export default function AccountLogin() {
  const [openDialog, setOpenDialog] = useState<
    null | "settings" | "feedback" | "help"
  >(null);

  const [feedbackText, setFeedbackText] = useState("");
  const { t } = useAppTranslation("translation");

  const {
    user,
    setUser,
    setSession,
    userConfig,
    setUserConfig,
    updateUserConfig,
    logout,
  } = useAuthStore();
  const features = t("helpDescription.features.general.features", {
    returnObjects: true,
  }) as string[];
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
        if (data?.config) setUserConfig(data.config);
        if (accessToken) {
          setSession({
            accessToken,
          });
        }
      } catch (error) {
        void error;
      }
    },
    onError: () => {},
  });

  const handleNotifyChange = async (checked: boolean) => {
    // Turning off never needs browser permission.
    if (!checked) {
      updateUserConfig({ notifications: false });
      return;
    }
    if (!("Notification" in window)) {
      updateUserConfig({ notifications: false });
      toast.error(t("notificationUnsupported"));
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") {
      try {
        permission = await Notification.requestPermission();
      } catch {
        // Safari < 16 only supports the callback form.
        permission = await new Promise<NotificationPermission>((resolve) =>
          Notification.requestPermission(resolve),
        );
      }
    }
    if (permission === "granted") {
      updateUserConfig({ notifications: true });
    } else {
      updateUserConfig({ notifications: false });
      if (permission === "denied") toast.error(t("notificationBlocked"));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Account setting"
            size="icon"
            className="text-muted-foreground hover:text-foreground focus:ring-2 bg-muted/60 hover:bg-muted border border-border/50 relative pointer-events-auto focus:ring-primary/30 rounded-full transition-colors duration-200"
          >
            {user?.avatar ? (
              <Image
                src={user.avatar}
                width={30}
                height={30}
                alt={user.name}
                className="w-full h-full rounded-full "
              />
            ) : (
              <User className="h-6 w-6 " />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2">
          <DropdownMenuLabel className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {user ? t("welcome", { name: user.name }) : "請先登入"}
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
                {t("settingTitle")}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setOpenDialog("help")}
                className="text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <Info className="mr-2 h-4 w-4" />
                {t("help")}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              {user && (
                <DropdownMenuItem
                  onClick={logout}
                  className="text-sm text-red-500 hover:text-red-600 rounded-md"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("logout")}
                </DropdownMenuItem>
              )}
            </>
          }
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 設定 Dialog */}
      <Dialog
        open={openDialog === "help"}
        onOpenChange={() => setOpenDialog(null)}
      >
        <DialogContent className="max-w-lg w-11/12 rounded-lg p-6 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t("help")}
            </DialogTitle>
          </DialogHeader>
          <div className=" text-muted-foreground space-y-4 mt-4 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mt-4 [&>h2]:mb-2 [&>h2]:text-primary [&>ul]:list-disc [&>ul]:pl-6 ">
            <h1 className="  whitespace-pre-line">
              {t("helpDescription.overview")}
            </h1>
            <h2>{t("helpDescription.features.general.title")}</h2>
            <ul itemType="circle">
              {features.map((feature: string) => (
                <li key={feature} className="whitespace-pre-line">
                  {feature}
                </li>
              ))}
            </ul>
            <h2>{t("helpDescription.features.taipei.title")}</h2>
            <p>{t("helpDescription.features.taipei.features.filter")}</p>
            <p>{t("helpDescription.features.taipei.note")}</p>
            <ul>
              {(
                t("helpDescription.features.taipei.icons", {
                  returnObjects: true,
                }) as string[]
              ).map((icon: string) => (
                <li key={icon} className="whitespace-pre-line">
                  {icon}
                </li>
              ))}
            </ul>
            <h2>{t("helpDescription.feedback.title")}</h2>
            <ul>
              {(
                t("helpDescription.feedback.steps", {
                  returnObjects: true,
                }) as string[]
              ).map((step) => (
                <li key={step} className="whitespace-pre-line">
                  {step}
                </li>
              ))}
            </ul>
            <ul>
              {(
                t("helpDescription.feedback.examples", {
                  returnObjects: true,
                }) as string[]
              ).map((step) => (
                <li key={step} className="whitespace-pre-line">
                  {step}
                </li>
              ))}
            </ul>
            <h2>{t("helpDescription.faq.title")}</h2>
            <ul className="space-y-4">
              {(
                t("helpDescription.faq.items", {
                  returnObjects: true,
                }) as { question: string; answer: string }[]
              ).map((item) => (
                <li
                  key={item.question}
                  className="whitespace-pre-line space-y-2"
                >
                  <h2 className="font-bold  text-primary">{item.question}</h2>
                  <p>{item.answer}</p>
                </li>
              ))}
            </ul>
            <h2>Repository：</h2>
            <Link
              href="https://github.com/yuzen9622/taipei-accessible-map"
              className="underline"
              target="_BLANK"
            >
              https://github.com/yuzen9622/taipei-accessible-map
            </Link>
            <h2>{t("data")}</h2>
            <div className="grid gap-4">
              <Link
                href="https://tdx.transportdata.tw "
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src={"https://tdx.transportdata.tw/images/tdxlogo.png"}
                  alt={t("tdx")}
                  className=" dark:bg-primary bg-primary-foreground p-1 rounded-md"
                  width={200}
                  height={100}
                />
              </Link>
              <Link
                href="https://data.moenv.gov.tw/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src={"/epa-logo.svg"}
                  alt={t("moe")}
                  width={200}
                  height={100}
                  className=" bg-primary dark:bg-primary-foreground p-1 rounded-md"
                />
              </Link>
              <Link
                href="https://data.gov.tw/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src={"/gov-open-data.svg"}
                  alt={t("gov")}
                  className=" dark:bg-primary bg-primary-foreground p-1 rounded-md"
                  width={200}
                  height={100}
                />
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDialog === "settings"}
        onOpenChange={() => setOpenDialog(null)}
      >
        <DialogContent className="max-w-md rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t("settingTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {t("settingDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 深色模式 */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {t("darkMode")}
              </span>
              <ThemeSwitcher
                value={userConfig.darkMode}
                onChange={(changeTheme) => {
                  updateUserConfig({ darkMode: changeTheme });
                }}
              />
            </div>

            {/* 高對比模式 */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Contrast className="h-4 w-4" /> {t("highContrast")}
              </span>
              <Switch
                id="highContrast"
                className="bg-accent"
                checked={userConfig.highContrast}
                onCheckedChange={(checked) =>
                  updateUserConfig({ highContrast: checked })
                }
              />
            </div>

            {/* 通知 */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {t("notification")}
              </span>
              <Switch
                id="notification"
                className=" bg-accent"
                checked={userConfig.notifications}
                onCheckedChange={handleNotifyChange}
              />
            </div>

            {/* 語言 */}
            <div className="flex  justify-between">
              <span className="text-sm font-medium  text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Globe className="h-4 w-4" /> {t("language")}
              </span>
              <Select
                onValueChange={(key) =>
                  updateUserConfig({
                    language: key as LanguageEnum,
                  })
                }
              >
                <SelectTrigger>
                  {LanguageConfig[userConfig.language].label}
                </SelectTrigger>

                <SelectContent>
                  {Object.entries(LanguageConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 字體大小 */}
            <div className="flex  justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <Type className="h-4 w-4" /> {t("fontSize")}
              </span>
              <Select
                onValueChange={(v) =>
                  updateUserConfig({
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
            </div>

            {/* 主題顏色：改成色塊選擇 */}
            {/* <div className="flex flex-col">
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
                        " ring-2  ring-offset-1 ring-ring "
                    )}
                  />
                ))}
              </div>
            </div> */}
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
              {t("feedback")}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {t("feedbackDesc")}
            </DialogDescription>
          </DialogHeader>

          <textarea
            className="w-full border rounded-md p-2 text-sm mt-4"
            rows={4}
            placeholder={t("feedbackPlaceholder")}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <Button aria-label="Submit feedback" className="w-full mt-2 text-sm">
            {t("submit")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
