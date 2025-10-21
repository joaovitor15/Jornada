'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Link, useRouter } from 'next-intl/navigation';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { t } from '@/lib/locale';

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline sm:inline-block">
              {t.appName}
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center">
            {loading ? null : user ? (
              <Button variant="ghost" onClick={handleLogout}>
                {t.logout}
              </Button>
            ) : (
              <Button asChild variant="ghost">
                <Link href="/">{t.login}</Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
