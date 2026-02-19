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
  MessageCircle,
  Clock,
  TestTube,
} from 'lucide-react';

const practitionerNavItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/practitioner/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', href: '/practitioner/schedule', icon: CalendarDays },
  { label: 'Availability', href: '/practitioner/availability', icon: Clock },
  { label: 'Messages', href: '/practitioner/messages', icon: MessageCircle },
  { label: 'Lab Orders', href: '/practitioner/lab-orders', icon: TestTube },
  { label: 'Earnings', href: '/practitioner/earnings', icon: DollarSign },
  { label: 'Profile', href: '/practitioner/profile', icon: UserCircle },
  { label: 'Documents', href: '/practitioner/profile#documents', icon: FileCheck },
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
