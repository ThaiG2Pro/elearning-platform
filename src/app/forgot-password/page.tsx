'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { forgotPassword } from '@/lib/auth';
import { ForgotPasswordRequest } from '@/types/auth.types';
import Header from '@/components/Header';
import Toast from '@/components/Toast';

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
      <Header onJoin={() => router.push('/join')} />

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

        <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
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
              <p className="mt-2 text-sm text-gray-500">Chúng tôi sẽ gửi liên kết khôi phục mật khẩu nếu email tồn tại trong hệ thống. Vui lòng kiểm tra cả thư mục Spam.</p>
              {appState === 'error' && errorMessage && (
                <Toast message={errorMessage} type="error" onClose={() => setAppState('idle')} />
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
        </div>

        {/* Neutral Success Toast */}
        {appState === 'neutral_success' && (
          <Toast message="Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết khôi phục trong hộp thư." type="info" onClose={() => setAppState('idle')} />
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
