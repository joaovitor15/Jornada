'use client';

import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, Briefcase, Home, User, Circle } from 'lucide-react';
import { text } from '@/lib/strings';

function ProfileIcon({ profile }: { profile: string }) {
  switch (profile) {
    case 'Personal':
      return <User className="h-5 w-5 text-primary" />;
    case 'Home':
      return <Home className="h-5 w-5 text-primary" />;
    case 'Business':
      return <Briefcase className="h-5 w-5 text-primary" />;
    default:
      return <Circle className="h-5 w-5 text-primary" />;
  }
}

interface HeaderProps {
  menuTrigger?: React.ReactNode;
}

export default function Header({ menuTrigger }: HeaderProps) {
  const { user } = useAuth();
  const { activeProfile, setActiveProfile } = useProfile();

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
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
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                  <ProfileIcon profile={activeProfile} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>{text.header.profiles}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={activeProfile}
                  onValueChange={setActiveProfile}
                >
                  <DropdownMenuRadioItem value="Personal">
                    <User className="mr-2 h-4 w-4" />
                    <span>{text.header.personal}</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Home">
                    <Home className="mr-2 h-4 w-4" />
                    <span>{text.header.home}</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Business">
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span>{text.header.business}</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {/* Empty div to push the left content to the left */}
        </div>
      </div>
    </header>
  );
}
