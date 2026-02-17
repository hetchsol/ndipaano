'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import { Header } from '../../../components/layout/header';
import { Sidebar, MobileSidebar, SidebarItem } from '../../../components/layout/sidebar';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileText,
  Building2,
  BarChart3,
  Menu,
} from 'lucide-react';

const adminNavItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Verifications', href: '/admin/verifications', icon: ShieldCheck },
  { label: 'Compliance', href: '/admin/compliance', icon: FileText },
  { label: 'Pharmacies', href: '/admin/pharmacies', icon: Building2 },
  { label: 'Analytics', href: '/admin', icon: BarChart3 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initialize } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar items={adminNavItems} title="Admin Panel" />
        <MobileSidebar
          items={adminNavItems}
          title="Admin Panel"
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="lg:hidden p-4 pb-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
