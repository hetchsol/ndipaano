import React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="heart-pulse flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-primary-700 ndipaano-brand">Ndipaano!</span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Connecting Zambian patients with verified healthcare practitioners for
              quality home-based medical care.
            </p>
          </div>

          {/* For Patients */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">For Patients</h3>
            <ul className="mt-4 space-y-1">
              <li>
                <Link href="/search" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Find Practitioners
                </Link>
              </li>
              <li>
                <Link href="/register" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Create Account
                </Link>
              </li>
              <li>
                <Link href="/consent" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Manage Consent
                </Link>
              </li>
              <li>
                <Link href="/login" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Service Rates
                </Link>
              </li>
              <li>
                <Link href="#" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Emergency Services
                </Link>
              </li>
            </ul>
          </div>

          {/* For Practitioners */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">For Practitioners</h3>
            <ul className="mt-4 space-y-1">
              <li>
                <Link href="/register" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Join as Practitioner
                </Link>
              </li>
              <li>
                <Link href="#" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Verification Process
                </Link>
              </li>
              <li>
                <Link href="#" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Practitioner Guidelines
                </Link>
              </li>
              <li>
                <Link href="#" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Earnings & Payouts
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Legal & Support</h3>
            <ul className="mt-4 space-y-1">
              <li>
                <Link href="/consent" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  DPA Compliance
                </Link>
              </li>
              <li>
                <Link href="/login" className="inline-block py-1 text-sm text-gray-500 hover:text-primary-700">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} Ndipaano! Medical Home Care. All rights reserved.
            </p>
            <p className="text-xs text-gray-400">
              Compliant with the Zambia Data Protection Act, 2021
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
