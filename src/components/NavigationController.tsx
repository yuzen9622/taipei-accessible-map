"use client";

import useNavigation from "@/hook/useNavigation";

/**
 * Headless driver for the turn-by-turn engine. Rendered (by ClientMap) only
 * while navigation is active, so mount = nav start and unmount = nav end. Runs
 * the engine; renders nothing.
 */
export default function NavigationController() {
  useNavigation();
  return null;
}
