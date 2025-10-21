import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Metadata } from 'next';
import '../globals.css';
import { AuthProvider } from '@/components/auth-provider';
import Header from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { t } from '@/lib/locale';

export const metadata: Metadata = {
  title: t.appName,
  description: t.appDescription,
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  let messages;
  try {
    messages = await getMessages({ locale });
  } catch (error) {
    console.error("Couldn't get messages for locale", error);
  }

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
            <AuthProvider>
              <div className="flex min-h-screen w-full flex-col">
                <Header />
                <main className="flex flex-1 flex-col items-center p-4 sm:p-6 md:p-8">
                  {children}
                </main>
              </div>
              <Toaster />
            </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
