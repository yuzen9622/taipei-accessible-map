"use client";

import { useGoogleLogin } from "@react-oauth/google";

import {
  Brain,
  Contrast,
  Database,
  Globe,
  Info,
  LogOut,
  Settings,
  Shield,
  SlidersHorizontal,
  Type,
  User,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import EmergencyContactsDialog from "@/components/Sos/EmergencyContactsDialog";
import AIMemoryPanel from "@/components/settings/AIMemoryPanel";
import DataManagementPanel from "@/components/settings/DataManagementPanel";
import HelpDialog from "@/components/shared/HelpDialog";
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
import useMapStore from "@/stores/useMapStore";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { ThemeSwitcher } from "../ui/shadcn-io/theme-switcher";

export default function AccountLogin() {
  const [settingsTab, setSettingsTab] = useState<
    "general" | "safety" | "memory" | "data"
  >("general");
  const [openDialog, setOpenDialog] = useState<
    null | "settings" | "feedback" | "help"
  >(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [contactsDialogOpen, setContactsDialogOpen] = useState(false);
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
  const { setActiveRailPanel, setSheetMode } = useMapStore();
  const settingsSections = [
    {
      key: "general" as const,
      icon: SlidersHorizontal,
      label: t("settingsTabGeneral"),
      title: t("settingsAppearanceTitle"),
      desc: t("settingsAppearanceDesc"),
    },
    {
      key: "safety" as const,
      icon: Shield,
      label: t("settingsTabSafety"),
      title: t("settingsEmergencyTitle"),
      desc: t("settingsEmergencyDesc"),
    },
    {
      key: "memory" as const,
      icon: Brain,
      label: t("settingsTabMemory"),
      title: t("aiMemoryTitle"),
      desc: t("aiMemoryDesc"),
    },
    {
      key: "data" as const,
      icon: Database,
      label: t("settingsTabData"),
      title: t("settingsDataTitle"),
      desc: t("settingsDataDesc"),
    },
  ];
  const activeSettingsSection =
    settingsSections.find((section) => section.key === settingsTab) ??
    settingsSections[0];
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

  const openSavedPlacesManager = () => {
    setOpenDialog(null);
    setSheetMode("home");
    setActiveRailPanel("saved");
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
                onClick={() => {
                  setSettingsTab("general");
                  setOpenDialog("settings");
                }}
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

      {/* 使用說明 Dialog */}
      <HelpDialog
        open={openDialog === "help"}
        onOpenChange={() => setOpenDialog(null)}
      />

      <Dialog
        open={openDialog === "settings"}
        onOpenChange={() => setOpenDialog(null)}
      >
        <DialogContent className="w-[min(97vw,768px)] max-w-[min(97vw,768px)] h-[min(92vh,840px)] rounded-2xl p-0 overflow-hidden sm:max-w-[min(97vw,1280px)]">
          <div className="grid h-full grid-cols-[88px_minmax(0,1fr)] bg-background md:grid-cols-[30%_minmax(0,1fr)]">
            <aside className="border-r border-border/60 bg-muted/35">
              <div className="flex h-full flex-col ">
                <div className="border-b border-border/60 px-3 py-4 md:px-4 md:py-5 hidden md:block">
                  <div className="space-y-1">
                    <p className="text-lg font-medium uppercase tracking-[0.18em] text-muted-foreground ">
                      {t("settingTitle")}
                    </p>
                  </div>
                </div>
                <nav className=" space-y-1.5 px-2 py-3 md:px-3 md:py-4">
                  {settingsSections.map((section) => {
                    const Icon = section.icon;
                    const active = settingsTab === section.key;
                    return (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => setSettingsTab(section.key)}
                        className={`flex w-full items-center justify-center gap-3 rounded-xl  px-3 py-3 text-left text-sm transition-colors ${
                          active
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                            : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                        }`}
                        aria-pressed={active}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="hidden truncate font-medium md:inline">
                          {section.label}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            <div className="flex min-w-0 min-h-0 flex-col">
              <div className="shrink-0 border-b border-border/60 px-5 py-5 md:px-7">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-xl font-semibold">
                    {activeSettingsSection.title}
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-7">
                <div className="space-y-4">
                  {settingsTab === "general" && (
                    <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-4">
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-sm font-medium text-foreground">
                          {t("darkMode")}
                        </span>
                        <ThemeSwitcher
                          value={userConfig.darkMode}
                          onChange={(changeTheme) => {
                            updateUserConfig({ darkMode: changeTheme });
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-sm font-medium text-foreground flex items-center gap-1">
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
                        <p className="text-xs text-muted-foreground">
                          {t("settingsHighContrastLocalHint")}
                        </p>
                      </div>

                      <div className="flex justify-between items-center gap-4">
                        <span className="text-sm font-medium text-foreground">
                          {t("notification")}
                        </span>
                        <Switch
                          id="notification"
                          className=" bg-accent"
                          checked={userConfig.notifications}
                          onCheckedChange={handleNotifyChange}
                        />
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-sm font-medium text-foreground flex items-center gap-1">
                          <Globe className="h-4 w-4" /> {t("language")}
                        </span>
                        <Select
                          value={userConfig.language}
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
                            {Object.entries(LanguageConfig).map(
                              ([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  {config.label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-sm font-medium text-foreground flex items-center gap-1">
                          <Type className="h-4 w-4" /> {t("fontSize")}
                        </span>
                        <Select
                          onValueChange={(v) =>
                            updateUserConfig({
                              fontSize: v as FontSizeEnum,
                            })
                          }
                          value={userConfig.fontSize}
                        >
                          <SelectTrigger className="text-sm">
                            {fontSizeConfig[userConfig.fontSize].label}
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(fontSizeConfig).map(
                              ([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  {config.label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {settingsTab === "safety" && (
                    <div className="rounded-2xl border border-border/60 bg-background p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">
                          {t("settingsEmergencyTitle")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("settingsEmergencyDesc")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          setOpenDialog(null);
                          setContactsDialogOpen(true);
                        }}
                        disabled={!user}
                      >
                        <Shield className="h-4 w-4" />
                        {t("settingsEmergencyAction")}
                      </Button>
                    </div>
                  )}
                  {settingsTab === "safety" && !user && (
                    <p className="text-sm text-muted-foreground">
                      {t("login")}
                    </p>
                  )}
                  {settingsTab === "memory" && (
                    <AIMemoryPanel
                      active={
                        openDialog === "settings" && settingsTab === "memory"
                      }
                      loggedIn={Boolean(user)}
                    />
                  )}
                  {settingsTab === "data" && (
                    <DataManagementPanel
                      onOpenSavedPlaces={openSavedPlacesManager}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EmergencyContactsDialog
        open={contactsDialogOpen}
        onOpenChange={setContactsDialogOpen}
      />

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
