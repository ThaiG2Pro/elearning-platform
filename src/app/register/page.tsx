'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/lib/auth';
import { RegisterRequest } from '@/types/auth.types';
import Header from '@/components/Header';
import Toast from '@/components/Toast';
import { MARGIN_W } from '@/lib/vibe/theme';

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
        <div className="min-h-screen bg-ink-page">
            <Header onJoin={() => router.push('/join')} />

            <main className="max-w-md mx-auto px-4 py-7 md:py-10">
                {/* ADAPT theo ngữ pháp "trang vở kẻ lề" (cùng login/page.tsx) —
                    vibe-demo không có trang đăng ký, đây là áp dụng ngôn ngữ
                    thiết kế chứ không phải port nguyên trang. Logic form
                    (validateForm, fieldErrors, mã lỗi backend) giữ nguyên 100%. */}
                <div className="mb-6">
                    <h1 className="text-[clamp(20px,2.2vw,26px)] font-bold tracking-[-0.015em] text-ink-text mb-1">Tạo tài khoản</h1>
                    <p className="text-sm text-ink-textMuted">Hoàn thành thông tin để bắt đầu học.</p>
                </div>

                <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                    <form onSubmit={handleSubmit}>
                        {[
                            {
                                n: '01', field: (
                                    <>
                                        <label htmlFor="email" className="block text-sm font-medium text-ink-text mb-1.5">Email</label>
                                        <input
                                            id="email" name="email" type="email" value={email} readOnly
                                            className="w-full px-3 py-2.5 border border-ink-border rounded-lg text-sm bg-ink-page text-ink-textMuted"
                                        />
                                    </>
                                )
                            },
                            {
                                n: '02', field: (
                                    <>
                                        <label htmlFor="fullName" className="block text-sm font-medium text-ink-text mb-1.5">Họ và tên</label>
                                        <input
                                            id="fullName" name="fullName" type="text" required
                                            value={fullName} onChange={(e) => setFullName(e.target.value)}
                                            disabled={appState === 'submitting'}
                                            className={`w-full px-3 py-2.5 border rounded-lg text-sm text-ink-text placeholder:text-ink-textMuted focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-transparent disabled:opacity-50 transition-shadow ${fieldErrors.fullName ? 'border-red-400 bg-red-50' : 'border-ink-border'}`}
                                            placeholder="Nguyễn Văn A"
                                        />
                                        {fieldErrors.fullName && <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>}
                                    </>
                                )
                            },
                            {
                                n: '03', field: (
                                    <>
                                        <label htmlFor="age" className="block text-sm font-medium text-ink-text mb-1.5">Tuổi</label>
                                        <input
                                            id="age" name="age" type="number" min="1" required
                                            value={age} onChange={(e) => setAge(e.target.value)}
                                            disabled={appState === 'submitting'}
                                            className={`w-full px-3 py-2.5 border rounded-lg text-sm text-ink-text placeholder:text-ink-textMuted focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-transparent disabled:opacity-50 transition-shadow ${fieldErrors.age ? 'border-red-400 bg-red-50' : 'border-ink-border'}`}
                                            placeholder="18"
                                        />
                                        {fieldErrors.age && <p className="mt-1 text-xs text-red-600">{fieldErrors.age}</p>}
                                    </>
                                )
                            },
                            {
                                n: '04', field: (
                                    <>
                                        <label htmlFor="password" className="block text-sm font-medium text-ink-text mb-1.5">Mật khẩu</label>
                                        <input
                                            id="password" name="password" type="password" autoComplete="new-password" required minLength={6}
                                            value={password} onChange={(e) => setPassword(e.target.value)}
                                            disabled={appState === 'submitting'}
                                            className={`w-full px-3 py-2.5 border rounded-lg text-sm text-ink-text placeholder:text-ink-textMuted focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-transparent disabled:opacity-50 transition-shadow ${fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-ink-border'}`}
                                            placeholder="Tối thiểu 6 ký tự"
                                        />
                                        {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
                                    </>
                                )
                            },
                        ].map((row, i) => (
                            <div key={row.n} className={`flex items-stretch ${i === 0 ? 'pt-5' : ''}`}>
                                <span style={{ width: MARGIN_W }} className="shrink-0 flex items-start justify-center pt-[3px] font-mono text-[11px] text-ink-textDim">
                                    {row.n}
                                </span>
                                <div className="flex-1 min-w-0 border-l border-ink-marginLn pl-4 pr-5 pb-4">
                                    {row.field}
                                </div>
                            </div>
                        ))}

                        <div className="flex items-stretch border-t border-ink-border">
                            <span style={{ width: MARGIN_W }} className="shrink-0" />
                            <div className="flex-1 border-l border-ink-marginLn py-4 pl-4 pr-5">
                                <button
                                    type="submit"
                                    disabled={appState === 'submitting'}
                                    className="vd-focusable w-full py-2.5 px-4 bg-ink-accent hover:bg-ink-accent/90 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ink-accent focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {appState === 'submitting' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    {appState === 'submitting' ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                                </button>
                                <div className="mt-3 text-center">
                                    <button type="button" onClick={handleBackToIdentify} className="vd-focusable text-sm text-ink-textMuted hover:text-ink-text transition-colors">
                                        ← Quay lại
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
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
