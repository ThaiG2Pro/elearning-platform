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
    <div className="min-h-screen bg-slate-50">
      <Header onJoin={() => router.push('/join')} />

      <main className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4">
                <span className="text-white font-bold text-xl">E</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Khôi phục mật khẩu</h1>
            <p className="text-sm text-slate-500">Nhập email để nhận liên kết đặt lại</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                id="email" name="email" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={appState === 'submitting'}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow"
                placeholder="your@email.com"
              />
              <p className="mt-1.5 text-xs text-slate-400">Nếu email tồn tại, bạn sẽ nhận liên kết đặt lại. Kiểm tra cả thư mục Spam.</p>
            </div>

            <button
              type="submit"
              disabled={appState === 'submitting'}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {appState === 'submitting' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {appState === 'submitting' ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button onClick={handleBackToJoin} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              ← Quay lại đăng nhập
            </button>
          </div>
        </div>

        {appState === 'neutral_success' && (
          <Toast message="Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết khôi phục trong hộp thư." type="info" onClose={() => setAppState('idle')} />
        )}
        {appState === 'error' && errorMessage && (
          <Toast message={errorMessage} type="error" onClose={() => setAppState('idle')} />
        )}
      </main>
    </div>
  );
}
