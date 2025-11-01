'use client';

import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Wallet, Briefcase, Home, User, Circle } from 'lucide-react';
import { text } from '@/lib/strings';
import { cn } from '@/lib/utils';
import { type Profile } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';


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
    { id: text.header.profileTypes.home as Profile, label: text.header.home },
    { id: text.header.profileTypes.business as Profile, label: text.header.business },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
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
          
           {user && (
            <div className="flex items-center gap-1 rounded-lg p-1">
              <TooltipProvider delayDuration={0}>
              {profiles.map((profile) => (
                 <Tooltip key={profile.id}>
                    <TooltipTrigger asChild>
                       <Button
                        variant={activeProfile === profile.id ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setActiveProfile(profile.id)}
                        className="h-8 w-8 rounded-full"
                      >
                        <ProfileIcon profile={profile.id} />
                        <span className="sr-only">{profile.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{profile.label}</p>
                    </TooltipContent>
                  </Tooltip>
              ))}
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
