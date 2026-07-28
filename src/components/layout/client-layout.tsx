"use client";

import { useCallback, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import BottomSheet from "@/components/BottomSheet/BottomSheet";
import KeyboardShortcuts from "@/components/shared/KeyboardShortcuts";
import SkipNavLink from "@/components/shared/SkipNavLink";
import { refreshToken } from "@/lib/api/auth";
import { getUserInfo } from "@/lib/api/user";
import { migrateLegacyPlaceStorage } from "@/lib/place/adapters";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore, { type SavedPlaceCategory } from "@/stores/useMapStore";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initSearchHistory, initSavedPlaces, initSavedPlaceCategories } =
    useMapStore(
      useShallow((s) => ({
        initSearchHistory: s.initSearchHistory,
        initSavedPlaces: s.initSavedPlaces,
        initSavedPlaceCategories: s.initSavedPlaceCategories,
      })),
    );
  const { setSession, setUser, setUserConfig } = useAuthStore(
    useShallow((s) => ({
      setSession: s.setSession,
      setUser: s.setUser,
      setUserConfig: s.setUserConfig,
    })),
  );
  const getNewAccessToken = useCallback(async () => {
    const token = await refreshToken();
    if (token) {
      setSession({ accessToken: token });
      const { data } = await getUserInfo();
      if (data?.user) setUser(data.user);
      if (data?.config) {
        setUserConfig(data.config);
      }
    }
  }, [setSession, setUser, setUserConfig]);

  useEffect(() => {
    const storedHistory = localStorage.getItem("searchHistory");
    const storedSaved = localStorage.getItem("savedPlaces");
    const storedCats = localStorage.getItem("savedPlaceCategories");
    const storedVersion = localStorage.getItem("placeSchemaVersion");
    getNewAccessToken();

    if (storedVersion === "2") {
      try {
        initSearchHistory(storedHistory ? JSON.parse(storedHistory) : []);
        initSavedPlaces(storedSaved ? JSON.parse(storedSaved) : []);
        initSavedPlaceCategories(storedCats ? JSON.parse(storedCats) : {});
      } catch {
        // Ignore corrupted versioned caches without changing their version.
      }
      return;
    }

    try {
      const migrated = migrateLegacyPlaceStorage({
        searchHistory: storedHistory ? JSON.parse(storedHistory) : [],
        savedPlaces: storedSaved ? JSON.parse(storedSaved) : [],
        savedPlaceCategories: storedCats ? JSON.parse(storedCats) : {},
      });
      const nextHistory = JSON.stringify(migrated.searchHistory);
      const nextSaved = JSON.stringify(migrated.savedPlaces);
      const nextCategories = JSON.stringify(migrated.savedPlaceCategories);
      const restoreStoredValue = (key: string, value: string | null) => {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      };

      // Complete conversion before the first write; set the version only after
      // all three data keys have been persisted.
      try {
        localStorage.setItem("searchHistory", nextHistory);
        localStorage.setItem("savedPlaces", nextSaved);
        localStorage.setItem("savedPlaceCategories", nextCategories);
        localStorage.setItem("placeSchemaVersion", "2");
      } catch (error) {
        try {
          restoreStoredValue("searchHistory", storedHistory);
          restoreStoredValue("savedPlaces", storedSaved);
          restoreStoredValue("savedPlaceCategories", storedCats);
          restoreStoredValue("placeSchemaVersion", storedVersion);
        } catch {
          // A storage quota failure can also prevent rollback writes.
        }
        throw error;
      }

      initSearchHistory(migrated.searchHistory);
      initSavedPlaces(migrated.savedPlaces);
      initSavedPlaceCategories(
        migrated.savedPlaceCategories as Record<string, SavedPlaceCategory>,
      );
    } catch {
      // Keep the old keys and version untouched so migration retries next load.
    }
  }, [
    initSearchHistory,
    initSavedPlaces,
    initSavedPlaceCategories,
    getNewAccessToken,
  ]);

  return (
    <div className="w-full h-dvh flex flex-col">
      <SkipNavLink />
      <main
        id="main-map"
        className="flex-1 relative"
        role="main"
        aria-label="Map"
      >
        {children}
      </main>
      <BottomSheet />
      <KeyboardShortcuts />
    </div>
  );
}
