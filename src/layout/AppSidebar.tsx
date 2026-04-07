"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { usePortalConfig, usePortalForms } from "@/hooks/usePortalConfig";
import { icons, Settings, Circle, ChevronDown, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function resolveIcon(name: string): LucideIcon {
  return (icons as Record<string, LucideIcon>)[name] ?? Circle;
}

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const isActive = useCallback(
    (path: string) => path === pathname,
    [pathname],
  );

  const { config, loading: configLoading, isFeatureEnabled } = usePortalConfig();
  const { forms } = usePortalForms("custom");

  const isExpView = isExpanded || isHovered || isMobileOpen;

  // Auto-expand Forms menu when on a form page
  const isOnFormPage = !!pathname?.startsWith("/forms");
  useEffect(() => {
    if (isOnFormPage && forms.length > 0) setFormsOpen(true);
  }, [isOnFormPage, forms.length]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const navItems = React.useMemo(() => {
    const configNav = config?.navigation;
    if (!configNav || configNav.length === 0) return [];

    return configNav
      .filter((n) => n.visible)
      .sort((a, b) => a.position - b.position)
      .filter((n) => isFeatureEnabled(n.key))
      .filter((n) => n.key !== "forms")
      .map((n) => ({
        name: n.label,
        icon: resolveIcon(n.icon),
        path: n.path || `/${n.key}`,
      }));
  }, [config?.navigation, isFeatureEnabled]);

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
        ${isExpView ? "w-[280px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className="py-8 flex justify-center">
        {isExpView ? (
          <img src="/images/ciyex-connect-logo.png" alt="Ciyex Connect" className="h-16 w-auto" />
        ) : (
          <img src="/images/ciyex-connect.png" alt="Ciyex Connect" className="h-12 w-12" />
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
                    {isExpView && <span className="menu-item-text">{nav.name}</span>}
                  </Link>
                </li>
              );
            })}

            {/* Forms collapsible menu */}
            {forms.length > 0 && (
              <li>
                <button
                  onClick={() => setFormsOpen((o) => !o)}
                  className={`menu-item group w-full ${isOnFormPage ? "menu-item-active" : "menu-item-inactive"}`}
                >
                  <span className={`${isOnFormPage ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                    <ClipboardList className="w-5 h-5" />
                  </span>
                  {isExpView && (
                    <>
                      <span className="menu-item-text flex-1 text-left">Forms</span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${formsOpen ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </button>

                {/* Sub-items */}
                {formsOpen && isExpView && (
                  <ul className="mt-1 ml-6 flex flex-col gap-1 border-l border-gray-200 dark:border-gray-700 pl-3">
                    {forms.map((f) => {
                      const formPath = `/forms/${f.formKey}`;
                      const active = pathname === formPath || pathname?.startsWith(formPath + "/");
                      return (
                        <li key={f.formKey}>
                          <Link
                            href={formPath}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                              active
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`} />
                            <span className="truncate">{f.title}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            )}
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
          {isExpView && <span className="menu-item-text">Settings</span>}
        </Link>
      </div>
    </aside>
  );
};

export default AppSidebar;
