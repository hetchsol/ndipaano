import React from 'react';
import Link from 'next/link';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 p-12">
        <Link href="/" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="Ndipaano!" className="h-10 w-10" />
          <span className="text-2xl font-bold text-white ndipaano-brand">Ndipaano!</span>
        </Link>
        <div>
          <h1 className="text-4xl font-bold text-white">Welcome Back</h1>
          <p className="mt-4 text-lg text-gray-300">
            Sign in to access your healthcare dashboard, manage appointments,
            and connect with verified practitioners across Zambia.
          </p>
        </div>
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Ndipaano! Medical Home Care
        </p>
      </div>

      {/* Right Side - Form */}
      <div className="flex w-full items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Ndipaano!" className="h-9 w-9" />
              <span className="text-xl font-bold text-primary-700 ndipaano-brand">Ndipaano!</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
