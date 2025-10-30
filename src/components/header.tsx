'use client';

import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Wallet, Briefcase, Home, User, Circle } from 'lucide-react';
import { text } from '@/lib/strings';
import { cn } from '@/lib/utils';
import { type Profile } from '@/lib/types';

function ProfileIcon({ profile, className }: { profile: string; className?: string }) {
  switch (profile) {
    case text.header.profileTypes.personal:
      return <User className={cn("h-4 w-4", className)} />;
    case text.header.profileTypes.home:
      return <Home className={cn("h-4 w-4", className)} />;
    case text.header.profileTypes.business:
      return <Briefcase className={cn("h-4 w-4", className)} />;
    default:
      return <Circle className={cn("h-4 w-4", className)} />;
  }
}

interface HeaderProps {
  menuTrigger?: React.ReactNode;
}

export default function Header({ menuTrigger }: HeaderProps) {
  const { user } = useAuth();
  const { activeProfile, setActiveProfile } = useProfile();
  
  const profiles: { id: Profile, label: string }[] = [
    { id: text.header.profileTypes.personal as Profile, label: text.header.personal },
    { id: text.header.profileTypes.business as Profile, label: text.header.business },
    { id: text.header.profileTypes.home as Profile, label: text.header.home },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          {user && menuTrigger}

          <Link
            href={user ? '/dashboard' : '/'}
            className="flex items-center space-x-2"
          >
            <Wallet className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline sm:inline-block">
              {text.header.appName}
            </span>
          </Link>
        </div>

        {user && (
          <div className="flex items-center gap-2 rounded-lg bg-muted p-1">
            {profiles.map((profile) => (
               <Button
                key={profile.id}
                variant={activeProfile === profile.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveProfile(profile.id)}
                className={cn(
                  "flex items-center gap-2",
                  activeProfile === profile.id && "shadow-sm"
                )}
              >
                <ProfileIcon profile={profile.id} />
                <span className="hidden sm:inline">{profile.label}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
