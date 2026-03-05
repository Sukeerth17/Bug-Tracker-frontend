import React from 'react';
import { Link } from 'react-router-dom';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border shadow-xl p-6 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {children}

        {footerText && footerLinkText && footerLinkTo && (
          <p className="text-xs text-center text-muted-foreground">
            {footerText} <Link className="text-primary hover:underline" to={footerLinkTo}>{footerLinkText}</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;
