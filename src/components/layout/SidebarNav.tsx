
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutDashboard,
  BarChart,
  CreditCard,
  ClipboardList,
  Shield,
  ClipboardCheck,
  Tags,
  ArrowDownLeft,
  LogOut,
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
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Até logo!',
        description: 'Você saiu da sua conta com sucesso.',
      });
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao sair',
        description: 'Não foi possível fazer logout. Tente novamente.',
      });
    }
  };

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
      <div className="flex h-full flex-col items-center justify-between">
        {/* Main Nav Content */}
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

        {/* Footer with Logout */}
        <div className="w-full flex justify-center py-4 border-t">
           <Tooltip>
              <TooltipTrigger asChild>
                <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Sair"
                  >
                    <LogOut className="h-5 w-5 text-destructive" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Sair</p>
              </TooltipContent>
            </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
