'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/lib/auth';
import { RegisterRequest } from '@/types/auth.types';

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
                        Thiết lập hồ sơ
                    </h2>
                    <p className="text-gray-600">
                        Hoàn thành thông tin để tạo tài khoản
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email Display */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                        />
                    </div>

                    {/* Full Name Input */}
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                            Họ và tên
                        </label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={appState === 'submitting'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            placeholder="Nhập họ và tên đầy đủ"
                        />
                        {fieldErrors.fullName && (
                            <p className="mt-2 text-sm text-red-600">{fieldErrors.fullName}</p>
                        )}
                    </div>

                    {/* Age Input */}
                    <div>
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                            Tuổi
                        </label>
                        <input
                            id="age"
                            name="age"
                            type="number"
                            min="1"
                            required
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            disabled={appState === 'submitting'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            placeholder="Nhập tuổi của bạn"
                        />
                        {fieldErrors.age && (
                            <p className="mt-2 text-sm text-red-600">{fieldErrors.age}</p>
                        )}
                    </div>

                    {/* Password Input */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Mật khẩu
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={appState === 'submitting'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            placeholder="Tạo mật khẩu (tối thiểu 6 ký tự)"
                        />
                        {fieldErrors.password && (
                            <p className="mt-2 text-sm text-red-600">{fieldErrors.password}</p>
                        )}
                    </div>

                    {/* General Error Message */}
                    {errorMessage && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{errorMessage}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={appState === 'submitting'}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {appState === 'submitting' ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                    </button>
                </form>

                {/* Success Message */}
                {appState === 'request_sent' && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                        <div className="text-center">
                            <h3 className="text-sm font-medium text-green-800">
                                Yêu cầu đăng ký đã được gửi!
                            </h3>
                            <p className="mt-2 text-sm text-green-700">
                                Vui lòng kiểm tra email để kích hoạt tài khoản.
                            </p>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-6 text-center">
                    <button
                        onClick={handleBackToIdentify}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        Quay lại
                    </button>
                </div>
            </main>
        </div>
    );
}
