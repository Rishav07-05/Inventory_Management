"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Tags,
  Users,
  FileText,
  ShoppingCart,
  ClipboardList,
  LogOut,
  Menu,
  X,
  FlaskConical,
} from "lucide-react";
import { Role } from "@prisma/client";

interface SidebarProps {
  role: Role;
  userName?: string | null;
  userEmail: string;
}

export default function DashboardSidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Define navigation items based on user roles
  const getNavItems = () => {
    switch (role) {
      case Role.ADMIN:
        return [
          { label: "Dashboard", href: "/admin/dashboard/1weirdroute4Lxyz", icon: LayoutDashboard },
          { label: "Products", href: "/admin/products", icon: Package },
          { label: "Inventory", href: "/admin/inventory", icon: Warehouse },
          { label: "Categories", href: "/admin/categories", icon: Tags },
          { label: "Quotations", href: "/admin/quotations", icon: FileText },
          { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
          { label: "Users", href: "/admin/users", icon: Users },
          { label: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardList },
        ];
      case Role.SELLER:
        return [
          { label: "Dashboard", href: "/seller/dashboard", icon: LayoutDashboard },
          { label: "Browse Catalog", href: "/seller/catalog", icon: FlaskConical },
          { label: "Manage Products", href: "/seller/products", icon: Package },
          { label: "Quotations", href: "/seller/quotations", icon: FileText },
          { label: "Orders", href: "/seller/orders", icon: ShoppingCart },
        ];
      case Role.BUYER:
        return [
          { label: "Dashboard", href: "/buyer/dashboard", icon: LayoutDashboard },
          { label: "Catalog", href: "/buyer/catalog", icon: Package },
          { label: "Quotations", href: "/buyer/quotations", icon: FileText },
          { label: "Orders", href: "/buyer/orders", icon: ShoppingCart },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Nav Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 backdrop-blur-md lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-bold text-teal-400">
          <FlaskConical className="h-6 w-6 text-teal-400 animate-pulse" />
          <span className="text-white tracking-wider text-lg">ChemVantage</span>
        </Link>
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-900/40 backdrop-blur-xl transition-transform lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:static"
        } h-screen`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
          <FlaskConical className="h-6 w-6 text-teal-400 animate-pulse" />
          <span className="font-bold text-white tracking-wider text-xl">ChemVantage</span>
        </div>

        {/* User Info Card */}
        <div className="border-b border-slate-800 px-6 py-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</div>
          <div className="mt-1 font-bold text-teal-400 text-sm truncate">{userName || "User"}</div>
          <div className="text-slate-400 text-xs truncate">{userEmail}</div>
          <span className="mt-2 inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-400 border border-teal-500/20">
            {role}
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-100"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-teal-400" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="border-t border-slate-800 p-4">
          <div className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/40 hover:text-slate-100 transition cursor-pointer">
            <span className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-slate-400" />
              <SignOutButton redirectUrl="/sign-in" />
            </span>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        ></div>
      )}
    </>
  );
}
