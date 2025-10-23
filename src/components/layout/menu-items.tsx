'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenuButton, SidebarSeparator } from '@/components/ui/sidebar';

// TODO: Lift the modal state up to AppLayout
// For now, an alert is used as a placeholder.

const menuItems = [
  { href: '/dashboard', emoji: '📊', label: 'Dashboard' },
  { href: '/lancamentos', emoji: '💸', label: 'Lançamentos' },
  { href: '/carteira', emoji: '💼', label: 'Wallet' },
  {
    id: 'new-expense',
    emoji: '➕',
    label: 'Novo Lançamento',
    isButton: true,
    onClick: () => alert('Abrir modal de Novo Lançamento!'),
  },
  { isSeparator: true },
  { href: '/noticias', emoji: '📰', label: 'News' },
];

export function MenuItems() {
  const pathname = usePathname();

  return (
    <>
      {menuItems.map((item, index) => {
        if (item.isSeparator) {
          return <SidebarSeparator key={`sep-${index}`} className="my-2" />;
        }

        if (item.isButton) {
          return (
            <SidebarMenuButton
              key={item.id}
              onClick={item.onClick}
              tooltip={item.label}
              className="justify-center lg:justify-start"
            >
              <span role="img" aria-label={item.label} className="text-lg">
                {item.emoji}
              </span>
              <span className="group-data-[collapsible=icon]:hidden">
                {item.label}
              </span>
            </SidebarMenuButton>
          );
        }

        return (
          <SidebarMenuButton
            key={item.href}
            asChild
            data-active={pathname === item.href}
            tooltip={item.label}
            className="justify-center lg:justify-start"
          >
            <Link href={item.href!}>
              <span role="img" aria-label={item.label} className="text-lg">
                {item.emoji}
              </span>
              <span className="group-data-[collapsible=icon]:hidden">
                {item.label}
              </span>
            </Link>
          </SidebarMenuButton>
        );
      })}
    </>
  );
}
