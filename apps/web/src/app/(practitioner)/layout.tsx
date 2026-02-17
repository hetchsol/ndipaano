'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { Header } from '../../components/layout/header';
import { Sidebar, MobileSidebar, SidebarItem } from '../../components/layout/sidebar';
import {
  LayoutDashboard,
  CalendarDays,
  DollarSign,
  UserCircle,
  FileCheck,
  Menu,
} from 'lucide-react';

const practitionerNavItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', href: '/schedule', icon: CalendarDays },
  { label: 'Earnings', href: '/earnings', icon: DollarSign },
  { label: 'Profile', href: '/profile', icon: UserCircle },
  { label: 'Documents', href: '/profile#documents', icon: FileCheck },
];

export default function PractitionerLayout({
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
        <Sidebar items={practitionerNavItems} title="Practitioner Portal" />
        <MobileSidebar
          items={practitionerNavItems}
          title="Practitioner Portal"
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
