"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { usePortalConfig, usePortalForms } from "@/hooks/usePortalConfig";
import { icons, Settings, Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Resolve a Lucide icon component by name from config.
// Falls back to Circle if the name doesn't match any known icon.
function resolveIcon(name: string): LucideIcon {
  return (icons as Record<string, LucideIcon>)[name] ?? Circle;
}

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const isActive = useCallback(
    (path: string) => path === pathname || (path.startsWith("/forms/") && !!pathname?.startsWith(path)),
    [pathname],
  );

  const { config, loading: configLoading, isFeatureEnabled } = usePortalConfig();
  const { forms } = usePortalForms("custom");

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Build nav items from config, replacing the generic "forms" entry with
  // individual nav items for each active custom form
  const navItems = React.useMemo(() => {
    const configNav = config?.navigation;
    if (!configNav || configNav.length === 0) return [];

    const baseItems = configNav
      .filter((n) => n.visible)
      .sort((a, b) => a.position - b.position)
      .filter((n) => isFeatureEnabled(n.key))
      // Remove generic "forms" entry — individual forms replace it
      .filter((n) => n.key !== "forms")
      .map((n) => ({
        name: n.label,
        icon: resolveIcon(n.icon),
        path: n.path || `/${n.key}`,
      }));

    // Inject each active custom form as its own sidebar item
    const formItems = forms.map((f) => ({
      name: f.title,
      icon: resolveIcon("ClipboardList"),
      path: `/forms/${f.formKey}`,
    }));

    return [...baseItems, ...formItems];
  }, [config?.navigation, isFeatureEnabled, forms]);

  if (!isHydrated) {
    return (
      <aside className="fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 w-[90px] -translate-x-full lg:translate-x-0">
        <div className="text-center">
          <div className="animate-pulse bg-gray-300 h-8 w-8 rounded mx-auto mt-8"></div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? "w-[280px]" : isHovered ? "w-[280px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className="py-8 flex justify-center">
        {isExpanded || isHovered || isMobileOpen ? (
          <img
            src="/images/ciyex-connect-logo.png"
            alt="Ciyex Connect"
            className="h-16 w-auto"
          />
        ) : (
          <img
            src="/images/ciyex-connect.png"
            alt="Ciyex Connect"
            className="h-12 w-12"
          />
        )}
      </div>

      {/* Menu Items */}
      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar py-6">
        {configLoading && navItems.length === 0 ? (
          <div className="flex flex-col gap-3 px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 rounded-lg" />
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {navItems.map((nav) => {
              const Icon = nav.icon;
              return (
                <li key={nav.path}>
                  <Link
                    href={nav.path}
                    className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"}`}
                  >
                    <span className={`${isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <span className="menu-item-text">{nav.name}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Settings pinned bottom */}
      <div className="border-t dark:border-gray-700 py-4">
        <Link
          href="/settings"
          className={`menu-item group ${isActive("/settings") ? "menu-item-active" : "menu-item-inactive"}`}
        >
          <span className={`${isActive("/settings") ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
            <Settings className="w-5 h-5" />
          </span>
          {(isExpanded || isHovered || isMobileOpen) && (
            <span className="menu-item-text">Settings</span>
          )}
        </Link>
      </div>
    </aside>
  );
};

export default AppSidebar;
