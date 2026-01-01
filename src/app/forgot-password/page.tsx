'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { forgotPassword } from '@/lib/auth';
import { ForgotPasswordRequest } from '@/types/auth.types';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [appState, setAppState] = useState<'idle' | 'submitting' | 'neutral_success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateEmail(email)) {
      setAppState('error');
      setErrorMessage('Định dạng Email không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    setAppState('submitting');

    try {
      const request: ForgotPasswordRequest = {
        email: email.trim(),
      };

      await forgotPassword(request);

      // Success: Show neutral success message (Rule 11)
      setAppState('neutral_success');

    } catch (error: any) {
      setAppState('error');

      // Handle specific error codes
      if (error.message === 'INVALID_FORMAT') {
        setErrorMessage('Định dạng Email không hợp lệ. Vui lòng kiểm tra lại.');
      } else if (error.message === 'RATE_LIMIT_EXCEEDED') {
        setErrorMessage('Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.');
      } else {
        setErrorMessage(error.message || 'Có lỗi xảy ra khi gửi yêu cầu khôi phục.');
      }
    }
  };

  const handleBackToJoin = () => {
    // Navigate back to join gateway
    router.push('/join');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">E-Learning</h1>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Khôi phục mật khẩu
          </h2>
          <p className="text-gray-600">
            Nhập địa chỉ email để nhận liên kết khôi phục
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={appState === 'submitting'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="Nhập địa chỉ email"
            />
            {appState === 'error' && errorMessage && (
              <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={appState === 'submitting'}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {appState === 'submitting' ? 'Đang gửi...' : 'Gửi yêu cầu khôi phục'}
          </button>
        </form>

        {/* Neutral Success Message */}
        {appState === 'neutral_success' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-center">
              <h3 className="text-sm font-medium text-blue-800">
                Yêu cầu đã được gửi!
              </h3>
              <p className="mt-2 text-sm text-blue-700">
                Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết khôi phục trong hộp thư.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={handleBackToJoin}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Quay lại
          </button>
        </div>
      </main>
    </div>
  );
}
