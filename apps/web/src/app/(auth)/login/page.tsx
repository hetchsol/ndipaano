'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; requires2FA?: boolean } } };
      if (err.response?.data?.requires2FA) {
        setNeeds2FA(true);
        setCredentials({ email: data.email, password: data.password });
        toast.info('Please enter your two-factor authentication code.');
      } else {
        toast.error(err.response?.data?.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials || !twoFactorCode) return;

    setIsLoading(true);
    try {
      await login(credentials.email, credentials.password, twoFactorCode);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (needs2FA) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h2>
        <p className="mt-2 text-sm text-gray-500">
          Enter the 6-digit code from your authenticator app to continue.
        </p>

        <form onSubmit={handle2FASubmit} className="mt-8 space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary-700" />
            <Input
              type="text"
              placeholder="000000"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-lg tracking-widest"
              maxLength={6}
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Verify & Sign In
          </Button>

          <button
            type="button"
            onClick={() => {
              setNeeds2FA(false);
              setCredentials(null);
              setTwoFactorCode('');
            }}
            className="w-full text-center text-sm text-gray-500 hover:text-primary-700"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
      <p className="mt-2 text-sm text-gray-500">
        Access your Ndiipano healthcare account.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div className="relative">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Mail className="absolute right-3 top-[38px] h-4 w-4 text-gray-400" />
        </div>

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-700"
            />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>
          <Link
            href="#"
            className="text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          <Lock className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-primary-700 hover:text-primary-800"
          >
            Create Account
          </Link>
        </p>
      </div>

      <div className="mt-6 rounded-md bg-gray-50 p-3 text-center">
        <p className="text-xs text-gray-400">
          Protected by industry-standard encryption. Compliant with the Zambia Data Protection Act.
        </p>
      </div>
    </div>
  );
}
