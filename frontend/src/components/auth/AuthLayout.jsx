import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-secondary/10 flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#16653410_1px,transparent_1px),linear_gradient(to_bottom,#16653410_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="w-10 h-10">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="45" fill="#166534" />
              <circle cx="50" cy="50" r="35" fill="#22C55E" />
              <circle cx="50" cy="50" r="25" fill="#F0FDF4" />
              <circle cx="50" cy="50" r="15" fill="#166534" />
              <rect x="70" y="70" width="25" height="8" rx="4" fill="#166534" transform="rotate(45 70 70)" />
            </svg>
          </div>
          <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">CivicLens</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-primary/10 border border-primary/10 p-8">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
              {subtitle && <p className="text-foreground/60">{subtitle}</p>}
            </div>

            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center">
        <p className="text-sm text-foreground/50">
          © 2026 CivicLens. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default AuthLayout;
