import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication (any role)
const protectedRoutes = [
  '/dashboard',
  '/bookings',
  '/records',
  '/prescriptions',
  '/schedule',
  '/earnings',
  '/profile',
];

// Admin routes - require admin role
const adminRoutes = ['/admin'];

// Routes accessible only to unauthenticated users
const authRoutes = ['/login', '/register'];

// Public routes that don't need any auth checks
const publicRoutes = ['/', '/search', '/practitioners', '/consent'];

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth token and role from cookies
  // The auth store sets these cookies on login for middleware access
  const token = request.cookies.get('ndiipano_token')?.value;
  const userRole = request.cookies.get('ndiipano_role')?.value;

  // Skip middleware for static files, Next.js internals, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files (favicon.ico, images, etc.)
  ) {
    return NextResponse.next();
  }

  // Public routes are always accessible
  if (matchesRoute(pathname, publicRoutes)) {
    return NextResponse.next();
  }

  // Auth routes (login/register) - redirect authenticated users to their dashboard
  if (matchesRoute(pathname, authRoutes)) {
    if (token) {
      const dashboardUrl = getDashboardUrl(userRole);
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
    return NextResponse.next();
  }

  // All remaining routes require authentication
  const isProtectedRoute = matchesRoute(pathname, protectedRoutes);
  const isAdminRoute = matchesRoute(pathname, adminRoutes);

  if ((isProtectedRoute || isAdminRoute) && !token) {
    // Redirect unauthenticated users to login with a redirect param
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control for authenticated users
  if (token && userRole) {
    // Admin routes - only accessible by admins
    if (isAdminRoute && userRole !== 'admin') {
      return NextResponse.redirect(
        new URL(getDashboardUrl(userRole), request.url)
      );
    }

    // Practitioner-only routes - patients cannot access
    const practitionerOnlyRoutes = ['/schedule', '/earnings'];
    if (matchesRoute(pathname, practitionerOnlyRoutes) && userRole === 'patient') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Patient-only routes - practitioners should not access
    const patientOnlyRoutes = ['/records', '/prescriptions'];
    if (matchesRoute(pathname, patientOnlyRoutes) && userRole === 'practitioner') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Returns the appropriate dashboard URL for a given user role.
 * Both patients and practitioners use /dashboard (rendered differently by their respective layouts).
 * Admins go to /admin.
 */
function getDashboardUrl(role?: string): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'practitioner':
      return '/dashboard';
    case 'patient':
    default:
      return '/dashboard';
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
