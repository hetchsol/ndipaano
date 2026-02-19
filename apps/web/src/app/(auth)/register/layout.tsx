import React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 p-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Ndipaano!</span>
        </Link>
        <div>
          <h1 className="text-4xl font-bold text-white">
            Join Ndipaano! Today
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            Whether you are a patient seeking quality care or a practitioner
            looking to serve your community, Ndipaano! connects you with the
            right people.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <span className="text-sm font-bold text-white">1</span>
              </div>
              <p className="text-sm text-gray-300">Create your free account</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <span className="text-sm font-bold text-white">2</span>
              </div>
              <p className="text-sm text-gray-300">Complete your profile</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <span className="text-sm font-bold text-white">3</span>
              </div>
              <p className="text-sm text-gray-300">Start receiving or providing care</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Ndipaano! Medical Home Care
        </p>
      </div>

      {/* Right Side - Form */}
      <div className="flex w-full items-start justify-center overflow-y-auto px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-700">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-primary-700">Ndipaano!</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
