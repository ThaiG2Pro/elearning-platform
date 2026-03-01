'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/lib/auth';
import { RegisterRequest } from '@/types/auth.types';
import Header from '@/components/Header';
import Toast from '@/components/Toast';

export default function RegisterPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [password, setPassword] = useState('');
    const [continueUrl, setContinueUrl] = useState('/');
    const [appState, setAppState] = useState<'idle' | 'submitting' | 'request_sent' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        // Get email and continueUrl from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email') || '';
        const continueParam = urlParams.get('continueUrl') || '/';
        setEmail(emailParam);
        setContinueUrl(continueParam);
    }, []);

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        let isValid = true;

        // Validate fullName
        if (!fullName.trim()) {
            errors.fullName = 'Họ và tên không được để trống.';
            isValid = false;
        }

        // Validate age
        const ageNum = parseInt(age);
        if (!age || isNaN(ageNum) || ageNum <= 0) {
            errors.age = 'Tuổi phải là một số dương hợp lệ.';
            isValid = false;
        }

        // Validate password
        if (!password || password.length < 6) {
            errors.password = 'Mật khẩu phải chứa ít nhất 6 ký tự.';
            isValid = false;
        }

        setFieldErrors(errors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        setErrorMessage(null);

        if (!validateForm()) {
            return;
        }

        setAppState('submitting');

        try {
            const request: RegisterRequest = {
                email,
                fullName: fullName.trim(),
                age: parseInt(age),
                password,
                continueUrl,
            };

            await registerUser(request);

            // Success: Show request sent state
            setAppState('request_sent');

        } catch (error: any) {
            setAppState('error');

            // Handle specific error codes
            if (error.message === 'INVALID_AGE') {
                setFieldErrors({ age: 'Tuổi phải là một số dương hợp lệ.' });
            } else if (error.message === 'PASSWORD_TOO_SHORT') {
                setFieldErrors({ password: 'Mật khẩu phải chứa ít nhất 6 ký tự.' });
            } else if (error.message === 'USER_ALREADY_ACTIVE') {
                setErrorMessage('Địa chỉ email đã được đăng ký và kích hoạt. Vui lòng đăng nhập ngay.');
            } else if (error.message === 'VALIDATION_ERROR') {
                setErrorMessage('Thông tin nhập vào chưa chính xác. Vui lòng kiểm tra lại.');
            } else {
                setErrorMessage(error.message || 'Có lỗi xảy ra khi đăng ký.');
            }
        }
    };

    const handleBackToIdentify = () => {
        // Navigate back to join gateway with current continueUrl
        router.push(`/join?continueUrl=${encodeURIComponent(continueUrl)}`);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header onJoin={() => router.push('/join')} />

            <main className="max-w-md mx-auto px-4 py-12">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4">
                        <span className="text-white font-bold text-xl">E</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">Tạo tài khoản</h1>
                    <p className="text-sm text-slate-500">Hoàn thành thông tin để bắt đầu học</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Display */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                            <input
                                id="email" name="email" type="email" value={email} readOnly
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500"
                            />
                        </div>

                        {/* Full Name */}
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">Họ và tên</label>
                            <input
                                id="fullName" name="fullName" type="text" required
                                value={fullName} onChange={(e) => setFullName(e.target.value)}
                                disabled={appState === 'submitting'}
                                className={`w-full px-3 py-2.5 border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow ${fieldErrors.fullName ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                                placeholder="Nguyễn Văn A"
                            />
                            {fieldErrors.fullName && <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>}
                        </div>

                        {/* Age */}
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-slate-700 mb-1.5">Tuổi</label>
                            <input
                                id="age" name="age" type="number" min="1" required
                                value={age} onChange={(e) => setAge(e.target.value)}
                                disabled={appState === 'submitting'}
                                className={`w-full px-3 py-2.5 border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow ${fieldErrors.age ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                                placeholder="18"
                            />
                            {fieldErrors.age && <p className="mt-1 text-xs text-red-600">{fieldErrors.age}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu</label>
                            <input
                                id="password" name="password" type="password" autoComplete="new-password" required minLength={6}
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                disabled={appState === 'submitting'}
                                className={`w-full px-3 py-2.5 border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow ${fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                                placeholder="Tối thiểu 6 ký tự"
                            />
                            {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={appState === 'submitting'}
                            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                            {appState === 'submitting' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {appState === 'submitting' ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                        </button>
                    </form>

                    <div className="mt-5 text-center">
                        <button onClick={handleBackToIdentify} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                            ← Quay lại
                        </button>
                    </div>
                </div>

                {appState === 'request_sent' && (
                    <Toast message="Yêu cầu đăng ký đã được gửi. Vui lòng kiểm tra email để kích hoạt tài khoản." type="success" onClose={() => setAppState('idle')} />
                )}
                {appState === 'error' && errorMessage && (
                    <Toast message={errorMessage} type="error" onClose={() => setAppState('idle')} />
                )}
            </main>
        </div>
    );
}
