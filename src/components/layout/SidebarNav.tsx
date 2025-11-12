
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  BarChart,
  CreditCard,
  ClipboardList,
  Shield,
  ClipboardCheck,
  Tags,
  ArrowDownLeft,
} from 'lucide-react';
import { text } from '@/lib/strings';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function SidebarNav() {
  const pathname = usePathname();

  const navLinks = [
    {
      href: '/dashboard',
      label: text.sidebar.dashboard,
      icon: LayoutDashboard,
    },
    {
      href: '/lancamentos',
      label: text.sidebar.releases,
      icon: ArrowDownLeft,
    },
    {
      href: '/relatorios',
      label: text.sidebar.reports,
      icon: BarChart,
    },
     {
      href: '/receitas-atuais',
      label: 'Receitas Atuais',
      icon: ClipboardList,
    },
    {
      href: '/planos-atuais',
      label: text.sidebar.currentPlans,
      icon: ClipboardCheck,
    },
    {
      href: '/cartoes',
      label: text.sidebar.cards,
      icon: CreditCard,
    },
    {
      href: '/reserva-de-emergencia',
      label: text.sidebar.emergencyReserve,
      icon: Shield,
    },
    {
      href: '/tags',
      label: text.sidebar.manageTags,
      icon: Tags,
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col items-center">
        {/* Content */}
        <nav className="flex flex-col items-center gap-2 py-4">
          {navLinks.map((link) => (
            <Tooltip key={link.href}>
              <TooltipTrigger asChild>
                <Link href={link.href}>
                  <Button
                    variant={pathname.startsWith(link.href) ? 'secondary' : 'ghost'}
                    size="icon"
                    className="rounded-full"
                    aria-label={link.label}
                  >
                    <link.icon className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{link.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t p-4 w-full flex justify-center" />
      </div>
    </TooltipProvider>
  );
}
