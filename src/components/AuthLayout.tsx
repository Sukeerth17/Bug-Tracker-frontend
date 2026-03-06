import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerLinkTo?: string;
}

const AuthLayout = ({ title, subtitle, children, footerText, footerLinkText, footerLinkTo }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(34,197,94,0.14),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(245,158,11,0.12),transparent_35%)]" />
      <Card className="w-full max-w-md border shadow-xl relative z-10">
        <CardHeader className="pb-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Ticket Desk</div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {children}

          {footerText && footerLinkText && footerLinkTo && (
            <p className="text-xs text-center text-muted-foreground">
              {footerText} <Link className="text-primary hover:underline" to={footerLinkTo}>{footerLinkText}</Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthLayout;
