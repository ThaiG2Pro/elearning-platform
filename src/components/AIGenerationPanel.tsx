'use client';

import { useState } from 'react';
import { generateAIContent, AIRecipeType } from '@/lib/aiGeneration';

interface AIGenerationPanelProps {
    sourceId: number;
}

/**
 * WP2.3 — UI hiển thị AI mặc định gắn vào course-item. Luôn optional: đây là
 * 1 card tách biệt bên dưới video, generate lỗi/chưa xong không chặn việc
 * học (video/tiến độ/note phía trên hoạt động độc lập, không phụ thuộc
 * component này). Chỉ render khi lesson có `sourceId` — lesson thêm thủ
 * công không có Source để tóm tắt.
 *
 * WP3.1 — thêm chế độ "tuỳ biến": nhập API key/endpoint/model riêng (BYOK) +
 * đổi độ dài/độ khó/ngôn ngữ, tuỳ chọn chia sẻ bản tuỳ biến cho người khác
 * dùng free (mục 4/5 economics doc). Ẩn mặc định — không đánh đổi độ đơn
 * giản của luồng miễn phí Checkpoint 2 cho phần lớn user không cần tuỳ biến.
 */
export default function AIGenerationPanel({ sourceId }: AIGenerationPanelProps) {
    const [loading, setLoading] = useState<AIRecipeType | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<Partial<Record<AIRecipeType, string>>>({});

    const [customMode, setCustomMode] = useState(false);
    const [byokApiKey, setByokApiKey] = useState('');
    const [byokBaseUrl, setByokBaseUrl] = useState('');
    const [byokModel, setByokModel] = useState('');
    const [length, setLength] = useState('standard');
    const [difficulty, setDifficulty] = useState('medium');
    const [shareWithOthers, setShareWithOthers] = useState(false);

    const handleGenerate = async (type: AIRecipeType) => {
        setLoading(type);
        setError(null);
        try {
            const options = customMode
                ? {
                    params: type === 'summary'
                        ? { length, language: 'vi' }
                        : { questionCount: 10, difficulty, language: 'vi' },
                    byokApiKey: byokApiKey.trim() || undefined,
                    byokBaseUrl: byokBaseUrl.trim() || undefined,
                    byokModel: byokModel.trim() || undefined,
                    requestedVisibility: (shareWithOthers ? 'SHARED' : 'PRIVATE') as 'SHARED' | 'PRIVATE',
                }
                : undefined;

            const result = await generateAIContent(sourceId, type, options);
            if (result.status === 'FAILED') {
                setError('Tạo nội dung AI thất bại, thử lại sau.');
            } else if (result.content) {
                setResults((prev) => ({ ...prev, [type]: result.content! }));
            }
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi tạo nội dung bằng AI.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Tóm tắt &amp; quiz bằng AI
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{customMode ? 'Dùng key riêng' : 'Miễn phí, tự động'}</span>
                    <button
                        onClick={() => setCustomMode((v) => !v)}
                        className="text-[10px] font-medium text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
                    >
                        {customMode ? 'Dùng bản mặc định' : 'Tuỳ biến'}
                    </button>
                </div>
            </div>

            {customMode && (
                <div className="mb-3 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-2.5">
                    <p className="text-[11px] text-slate-500">
                        Nhập API key của riêng bạn (Groq/OpenAI/Anthropic/OpenRouter/tự host — bất kỳ
                        endpoint OpenAI-compatible nào) để tuỳ biến không giới hạn. Đủ cả 3 ô mới dùng được.
                    </p>
                    <input
                        type="password"
                        value={byokApiKey}
                        onChange={(e) => setByokApiKey(e.target.value)}
                        placeholder="API key"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                        type="text"
                        value={byokBaseUrl}
                        onChange={(e) => setByokBaseUrl(e.target.value)}
                        placeholder="Endpoint (vd: https://api.groq.com/openai/v1)"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                        type="text"
                        value={byokModel}
                        onChange={(e) => setByokModel(e.target.value)}
                        placeholder="Tên model (vd: llama-3.3-70b-versatile)"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    <div className="flex gap-2 pt-1">
                        <select
                            value={length}
                            onChange={(e) => setLength(e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                            <option value="short">Tóm tắt ngắn</option>
                            <option value="standard">Tóm tắt chuẩn</option>
                            <option value="long">Tóm tắt dài</option>
                        </select>
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                            <option value="easy">Quiz dễ</option>
                            <option value="medium">Quiz trung bình</option>
                            <option value="hard">Quiz khó</option>
                        </select>
                    </div>

                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <input
                            type="checkbox"
                            checked={shareWithOthers}
                            onChange={(e) => setShareWithOthers(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Chia sẻ bản này cho người khác dùng miễn phí (chỉ áp dụng vì bạn dùng key riêng —
                        không tốn thêm chi phí của ai khác)
                    </label>
                </div>
            )}

            <div className="flex gap-2">
                <button
                    onClick={() => handleGenerate('summary')}
                    disabled={loading !== null}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 disabled:opacity-50 transition-colors"
                >
                    {loading === 'summary' ? (
                        <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    {results.summary ? 'Tạo lại tóm tắt' : 'Tóm tắt bài này'}
                </button>
                <button
                    onClick={() => handleGenerate('quiz')}
                    disabled={loading !== null}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 disabled:opacity-50 transition-colors"
                >
                    {loading === 'quiz' ? (
                        <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    {results.quiz ? 'Tạo lại quiz' : 'Tạo quiz 10 câu'}
                </button>
            </div>

            {error && (
                <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {error}
                </div>
            )}

            {results.summary && (
                <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Tóm tắt</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{results.summary}</p>
                </div>
            )}

            {results.quiz && (
                <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Quiz</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{results.quiz}</p>
                </div>
            )}
        </div>
    );
}
