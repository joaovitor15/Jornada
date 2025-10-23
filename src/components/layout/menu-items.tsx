'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenuButton } from '@/components/ui/sidebar';

const menuItems = [
  { href: '/dashboard', emoji: '📊', label: 'Dashboard' },
  { href: '/lancamentos', emoji: '💸', label: 'Lançamentos' },
  { href: '/carteira', emoji: '💼', label: 'Wallet' },
  { isSeparator: true },
  { href: '/noticias', emoji: '📰', label: 'News' },
];

export function MenuItems() {
  const pathname = usePathname();

  return (
    <>
      {menuItems.map((item, index) =>
        item.isSeparator ? (
          <div key={index} className="my-2 border-t border-muted" />
        ) : (
          <SidebarMenuButton
            key={item.href}
            href={item.href!}
            asChild
            data-active={pathname === item.href}
          >
            <Link href={item.href!}>
              <span role="img" aria-label={item.label} className="text-lg">
                {item.emoji}
              </span>
              {item.label}
            </Link>
          </SidebarMenuButton>
        )
      )}
    </>
  );
}
