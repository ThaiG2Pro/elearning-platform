'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { updateProfile, getProfile, updateAvatar, deleteAccount, exportMyData, logout as apiLogout, AuthUtils } from '@/lib/auth';
import { User } from '@/types/auth.types';

const MAX_AVATAR_SOURCE_BYTES = 8 * 1024 * 1024; // 8MB — resized down before upload anyway
const AVATAR_MAX_DIMENSION = 256;

// WP1.5.6 — no upload/storage infra exists anywhere in this app (see
// AuthService.ts comment), so the avatar is resized+compressed to a small
// data: URL entirely client-side before it's sent to the API.
function resizeImageToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('FILE_READ_FAILED'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
            img.onload = () => {
                let { width, height } = img;
                if (width > height && width > AVATAR_MAX_DIMENSION) {
                    height = Math.round((height * AVATAR_MAX_DIMENSION) / width);
                    width = AVATAR_MAX_DIMENSION;
                } else if (height > AVATAR_MAX_DIMENSION) {
                    width = Math.round((width * AVATAR_MAX_DIMENSION) / height);
                    height = AVATAR_MAX_DIMENSION;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('CANVAS_UNSUPPORTED'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
}

export default function EditProfilePage() {
    const router = useRouter();
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [email, setEmail] = useState('');
    const [appState, setAppState] = useState<'idle' | 'submitting' | 'success' | 'business_error' | 'system_error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);

    // WP1.5.6 — avatar upload state, independent of the name/age form above.
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);

    // WP1.5.6 — delete account state.
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // WP1.5.11 — export data state.
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    useEffect(() => {
        if (AuthUtils.isAuthenticated()) {
            setUser(AuthUtils.getCurrentUser());
        }
    }, []);

    const handleLogout = async () => {
        try {
            await apiLogout();
        } catch (error) {
            // ignore — still clear local session and navigate away
        } finally {
            setUser(null);
            router.push('/');
        }
    };

    const handleJoin = () => {
        const currentUrl = window.location.pathname;
        router.push(`/join?continueUrl=${encodeURIComponent(currentUrl)}`);
    };

    useEffect(() => {
        // Load current user profile
        const loadProfile = async () => {
            try {
                const profile = await getProfile();
                setEmail(profile.email);
                setFullName(profile.fullName);
                setAge(profile.age.toString());
                // WP1.5.12: `user` state above only comes from the
                // localStorage snapshot at mount — if avatar/name changed in
                // another session/device, that snapshot is stale. Re-sync it
                // from this fresh API response so the avatar shown here
                // can't drift from the form fields it sits next to.
                mergeIntoCurrentUser({ avatarUrl: profile.avatarUrl, fullName: profile.fullName });
            } catch (error) {
                console.error('Failed to load profile:', error);
                setAppState('system_error');
                setErrorMessage('Không thể tải hồ sơ. Vui lòng tải lại trang.');
            }
        };

        loadProfile();
    }, []);

    // Shared with the name/age save flow below — keeps localStorage AND the
    // `user` state driving the Header avatar/name in sync (WP1.5.12 pattern).
    const mergeIntoCurrentUser = (patch: Partial<User>) => {
        const currentUser = AuthUtils.getCurrentUser();
        if (!currentUser) return;
        const updatedUser = { ...currentUser, ...patch };
        AuthUtils.setUserInfo(updatedUser);
        setUser(updatedUser);
    };

    const handleAvatarButtonClick = () => {
        avatarInputRef.current?.click();
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file next time
        if (!file) return;

        setAvatarError(null);

        if (!file.type.startsWith('image/')) {
            setAvatarError('Vui lòng chọn một tệp ảnh (JPG, PNG hoặc WebP).');
            return;
        }
        if (file.size > MAX_AVATAR_SOURCE_BYTES) {
            setAvatarError('Ảnh quá lớn (tối đa 8MB).');
            return;
        }

        setAvatarUploading(true);
        try {
            const dataUrl = await resizeImageToDataUrl(file);
            const res = await updateAvatar({ avatarUrl: dataUrl });
            mergeIntoCurrentUser({ avatarUrl: res.avatarUrl });
        } catch (error: any) {
            setAvatarError(error.message || 'Không thể cập nhật ảnh đại diện.');
        } finally {
            setAvatarUploading(false);
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAppState('submitting');
        setErrorMessage(null);

        try {
            const ageNum = parseInt(age);
            if (isNaN(ageNum) || ageNum <= 0) {
                throw new Error('Tuổi phải là một số dương.');
            }

            await updateProfile({
                fullName: fullName.trim(),
                age: ageNum,
            });

            mergeIntoCurrentUser({ fullName: fullName.trim() });

            setAppState('success');
        } catch (error: any) {
            const message = error.message;
            if (message && (message.includes('tuổi') || message.includes('không hợp lệ'))) {
                setAppState('business_error');
                setErrorMessage(message);
            } else {
                // WP1.5.12: this used to leave errorMessage null, so the error
                // banner below rendered nothing — a save failure looked like
                // nothing happened at all.
                setAppState('system_error');
                setErrorMessage('Có lỗi xảy ra, không thể lưu hồ sơ. Vui lòng thử lại.');
            }
        }
    };

    const handleCancel = () => {
        router.back();
    };

    const handleExportData = async () => {
        if (exporting) return;
        setExportError(null);
        setExporting(true);
        try {
            await exportMyData();
        } catch (error: any) {
            setExportError(error.message || 'Có lỗi xảy ra khi xuất dữ liệu.');
        } finally {
            setExporting(false);
        }
    };

    const closeDeleteDialog = () => {
        setShowDeleteDialog(false);
        setDeletePassword('');
        setDeleteError(null);
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) return;
        setDeleteError(null);
        setDeleting(true);
        try {
            await deleteAccount({ password: deletePassword });
            AuthUtils.clearTokens();
            router.push('/');
        } catch (error: any) {
            setDeleteError(error.message || 'Có lỗi xảy ra khi xoá tài khoản.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-lg mx-auto px-4 py-10 space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Hồ sơ cá nhân</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Cập nhật thông tin tài khoản của bạn</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
                    {/* WP1.5.6 — avatar thật, thay vì chỉ chữ cái đầu */}
                    <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 flex-shrink-0">
                            {user?.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- data: URL
                                <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-semibold">
                                    {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                                </div>
                            )}
                            {avatarUploading && (
                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        <div>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                            <Button type="button" variant="outline" size="sm" onClick={handleAvatarButtonClick} disabled={avatarUploading}>
                                Đổi ảnh đại diện
                            </Button>
                            {avatarError && <p className="mt-1.5 text-xs text-red-600">{avatarError}</p>}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
                        {/* Email (Read-only) */}
                        <div className="pt-4">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                            <input
                                id="email" name="email" type="email" value={email} disabled
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-slate-400">Email không thể thay đổi</p>
                        </div>

                        {/* Full Name */}
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">Họ và tên</label>
                            <input
                                id="fullName" name="fullName" type="text" required
                                value={fullName} onChange={(e) => setFullName(e.target.value)}
                                disabled={appState === 'submitting'}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow"
                                placeholder="Nguyễn Văn A"
                            />
                        </div>

                        {/* Age */}
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-slate-700 mb-1.5">Tuổi</label>
                            <input
                                id="age" name="age" type="number" min="1" required
                                value={age} onChange={(e) => setAge(e.target.value)}
                                disabled={appState === 'submitting'}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow"
                                placeholder="18"
                            />
                            {(appState === 'business_error' || appState === 'system_error') && errorMessage && (
                                <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
                            )}
                        </div>

                        {/* Success inline */}
                        {appState === 'success' && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                <p className="text-sm text-emerald-700 font-medium">Hồ sơ đã được cập nhật!</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
                            <Button type="button" variant="outline" onClick={handleCancel} disabled={appState === 'submitting'} className="flex-1">
                                Hủy
                            </Button>
                            <Button type="submit" disabled={appState === 'submitting'} className="flex-1">
                                {appState === 'submitting' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                {appState === 'submitting' ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </Button>
                        </div>
                    </form>

                    {/* WP1.5.6 — trước đây đổi mật khẩu chỉ vào được qua
                        dropdown Header, không có lối vào nào từ chính trang
                        hồ sơ. */}
                    <div className="pt-2 border-t border-slate-100">
                        <Button type="button" variant="link" className="px-0" onClick={() => router.push('/change-password')}>
                            Đổi mật khẩu →
                        </Button>
                    </div>
                </div>

                {/* WP1.5.11 — xuất dữ liệu cá nhân (nửa "export" của cặp
                    xoá tài khoản/export dữ liệu; xoá tài khoản đã có từ
                    WP1.5.6 ở khối dưới). */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-sm font-semibold text-slate-900 mb-1">Xuất dữ liệu của tôi</h2>
                    <p className="text-sm text-slate-500 mb-4">
                        Tải về một bản sao dữ liệu của bạn (hồ sơ, Space đã tạo, tiến độ học, ghi chú) dưới dạng tệp JSON.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={handleExportData} disabled={exporting}>
                        {exporting && <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />}
                        {exporting ? 'Đang chuẩn bị...' : 'Tải xuống dữ liệu (JSON)'}
                    </Button>
                    {exportError && <p className="mt-2 text-xs text-red-600">{exportError}</p>}
                </div>

                {/* WP1.5.6 — xoá tài khoản */}
                <div className="bg-white border border-red-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-sm font-semibold text-red-700 mb-1">Xoá tài khoản</h2>
                    <p className="text-sm text-slate-500 mb-4">
                        Hành động này không thể hoàn tác. Bạn sẽ không thể đăng nhập lại bằng tài khoản này.
                    </p>
                    <Button type="button" variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                        Xoá tài khoản của tôi
                    </Button>
                </div>
            </main>

            <Dialog open={showDeleteDialog} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xoá tài khoản</DialogTitle>
                        <DialogDescription>
                            Nhập mật khẩu hiện tại để xác nhận. Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleDeleteAccount(); }}
                        placeholder="Mật khẩu hiện tại"
                        autoFocus
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDeleteDialog} disabled={deleting}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting || !deletePassword}>
                            {deleting ? 'Đang xoá…' : 'Xoá tài khoản'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
