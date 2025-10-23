'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenuButton, SidebarSeparator } from '@/components/ui/sidebar';

const menuItems = [
  { href: '/dashboard', emoji: '📊', label: 'Dashboard' },
  { href: '/lancamentos', emoji: '💸', label: 'Lançamentos' },
  { href: '/carteira', emoji: '💼', label: 'Wallet' },
  { isSeparator: true },
  { href: '/noticias', emoji: '📰', label: 'News' },
];

interface MenuItemsProps {
  onAddExpenseClick: () => void;
}

export function MenuItems({ onAddExpenseClick }: MenuItemsProps) {
  const pathname = usePathname();

  const addExpenseItem = {
    id: 'new-expense',
    emoji: '➕',
    label: 'Novo Lançamento',
  };

  return (
    <>
      {/* Add Expense Button - Placed first for prominence */}
      <SidebarMenuButton
        key={addExpenseItem.id}
        onClick={onAddExpenseClick}
        tooltip={addExpenseItem.label}
        className="justify-center group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-0 lg:justify-start"
      >
        <span role="img" aria-label={addExpenseItem.label} className="text-xl">
          {addExpenseItem.emoji}
        </span>
        <span className="group-data-[collapsible=icon]:hidden ml-2">
          {addExpenseItem.label}
        </span>
      </SidebarMenuButton>

      <SidebarSeparator className="my-2" />

      {menuItems.map((item) => {
        if (item.isSeparator) {
          return <SidebarSeparator key="main-sep" className="my-2" />;
        }

        return (
          <SidebarMenuButton
            key={item.href}
            asChild
            data-active={pathname === item.href}
            tooltip={item.label}
            className="justify-center group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-0 lg:justify-start"
          >
            <Link href={item.href!}>
              <span role="img" aria-label={item.label} className="text-xl">
                {item.emoji}
              </span>
              <span className="group-data-[collapsible=icon]:hidden ml-2">
                {item.label}
              </span>
            </Link>
          </SidebarMenuButton>
        );
      })}
    </>
  );
}
