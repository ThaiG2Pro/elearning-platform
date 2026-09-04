'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    generateAIContent,
    parseAIQuizContent,
    AIRecipeType,
    AIGenerationError,
    AIQuizQuestionDraft,
} from '@/lib/aiGeneration';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import MarkdownText from '@/components/MarkdownText';
import VideoSourceDropdown from '@/components/VideoSourceDropdown';

/**
 * 1 lesson VIDEO có Source trong space — ứng viên làm "video nguồn" cho AI.
 * `chapterId`/`chapterTitle` đi kèm để bài quiz mới được tạo đúng vào chương
 * chứa video sinh ra nó, và để dropdown hiển thị đủ ngữ cảnh khi space có
 * nhiều chương trùng tên bài.
 */
export interface AIVideoSourceOption {
    lessonId: number;
    lessonTitle: string;
    sourceId: number;
    chapterId: number;
    chapterTitle: string;
}

interface AILessonComposerProps {
    open: boolean;
    /** Nút trigger nào mở dialog ("Tạo quiz tại đây" / "Tạo tóm tắt"). */
    initialType: AIRecipeType;
    videoOptions: AIVideoSourceOption[];
    onClose: () => void;
    /**
     * Quiz parse xong là RÁP NGAY thành 1 lesson QUIZ thật (quyết định UX
     * 2026-08-21: trigger AI sống ở trang edit, kết quả phải thành cấu trúc
     * space luôn, không dừng ở bản xem trước). Trang edit sở hữu việc
     * createLesson + saveGeneratedQuizQuestions + cập nhật cây chương.
     * `servedFromCache` để toast nói rõ khi bản này trùng với quiz đã tạo
     * trước đó cho cùng video (cache theo source+recipe dùng chung).
     */
    onCreateQuizLesson: (
        chapterId: number,
        draft: AIQuizQuestionDraft[],
        sourceLessonTitle: string,
        servedFromCache: boolean,
    ) => Promise<void>;
}

/**
 * Quyết định UX 2026-08-21: trang edit là NƠI DUY NHẤT trigger AI (trang học
 * chỉ còn nút điều hướng về đây — xem spaces/[id]/learn). Dialog này gom đủ
 * lựa chọn cho cả 2 recipe:
 *   - dropdown chọn video nguồn trong toàn bộ space (không giới hạn 1 chương);
 *   - bản miễn phí: recipe mặc định, khoá tham số (đúng luật SHARED_FREE —
 *     đổi bất kỳ tham số nào không còn là "mặc định" nữa, xem Recipes.ts);
 *   - bản tuỳ biến: số câu / độ khó / độ dài / chủ đề focus / BYOK. Không có
 *     key riêng thì server trả AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID và UI
 *     hiện nút trả phí bằng credit — chính sách tier (free/BYOK/vip) nằm ở
 *     AIGenerationPolicy phía server, UI này không tự quyết định giá.
 *
 * Tóm tắt chỉ hiển thị + copy được (chưa có loại lesson dạng text để "ráp
 * thành bài học" như quiz — nếu sau này thêm lesson TEXT thì nối vào cùng
 * callback pattern với onCreateQuizLesson).
 */
export default function AILessonComposer({
    open,
    initialType,
    videoOptions,
    onClose,
    onCreateQuizLesson,
}: AILessonComposerProps) {
    const [type, setType] = useState<AIRecipeType>(initialType);
    const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
    // 2026-09-04 — bỏ toggle "bật/tắt tuỳ biến": panel tuỳ biến giờ LUÔN hiện
    // sẵn (pill chọn số câu/độ khó, ô chủ đề), badge trạng thái cập nhật
    // SỐNG theo giá trị đang chọn thay vì 1 dòng chữ tĩnh nói "tuỳ biến = cần
    // trả phí" ngay khi vừa mở panel (sai — để nguyên mặc định vẫn miễn phí).
    // Chỉ khối BYOK (ít dùng, nhiều ô) gấp lại mặc định.
    const [byokOpen, setByokOpen] = useState(false);

    // Tham số tuỳ biến — chỉ gửi lên khi customMode bật. Nếu user bật tuỳ
    // biến nhưng để nguyên mặc định và không nhập chủ đề, params gửi lên
    // trùng DEFAULT_RECIPE_PARAMS → server vẫn coi là recipe mặc định (đi
    // đường miễn phí) — không phạt user vì lỡ mở panel tuỳ biến.
    const [questionCount, setQuestionCount] = useState(10);
    const [difficulty, setDifficulty] = useState('medium');
    const [length, setLength] = useState('standard');
    const [focusTopic, setFocusTopic] = useState('');
    const [byokApiKey, setByokApiKey] = useState('');
    const [byokBaseUrl, setByokBaseUrl] = useState('');
    const [byokModel, setByokModel] = useState('');
    const [shareWithOthers, setShareWithOthers] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [summaryResult, setSummaryResult] = useState<string | null>(null);
    const [summaryCopied, setSummaryCopied] = useState(false);
    // Các sourceId đã tạo quiz trong phiên dialog này — lần generate tiếp
    // theo cho cùng video sẽ force qua cache, tránh tạo thêm 1 lesson quiz
    // giống hệt bản vừa tạo mà user không hiểu vì sao "tạo mới" ra bản cũ.
    const [quizGeneratedSourceIds, setQuizGeneratedSourceIds] = useState<Set<number>>(new Set());

    // Mỗi lần mở lại dialog: reset về type của nút vừa bấm + xoá kết quả/lỗi
    // phiên trước; giữ nguyên các ô BYOK/tham số (nhập lại key mỗi lần rất
    // phiền, key chỉ sống trong state — không lưu đâu cả).
    useEffect(() => {
        if (open) {
            setType(initialType);
            setError(null);
            setErrorCode(null);
            setSummaryResult(null);
            setSummaryCopied(false);
        }
    }, [open, initialType]);

    const selected = videoOptions.find(v => v.lessonId === selectedLessonId) ?? videoOptions[0] ?? null;

    // Params đang chọn có TRÙNG recipe mặc định của server không (Recipes.ts
    // DEFAULT_RECIPE_PARAMS) — quyết định badge hiện "Miễn phí" hay "Cần BYOK
    // hoặc trả phí". Luôn gửi params lên (không còn nhánh customMode ẩn/hiện
    // params nữa) — khi trùng mặc định, server tự đi đường miễn phí y hệt
    // trước đây dù params có mặt trong request hay không.
    const trimmedTopic = focusTopic.trim();
    const isDefaultParams = trimmedTopic === '' && (type === 'summary' ? length === 'standard' : questionCount === 10 && difficulty === 'medium');
    const hasFullByok = byokApiKey.trim() !== '' && byokBaseUrl.trim() !== '' && byokModel.trim() !== '';
    const isFree = isDefaultParams || hasFullByok;

    const handleGenerate = async (paymentMethod?: 'CREDITS') => {
        if (!selected) return;
        setLoading(true);
        setError(null);
        setErrorCode(null);
        setSummaryResult(null);
        setSummaryCopied(false);
        try {
            const options = {
                params: type === 'summary'
                    ? { length, language: 'vi', ...(trimmedTopic ? { focusTopic: trimmedTopic } : {}) }
                    : { questionCount, difficulty, language: 'vi', ...(trimmedTopic ? { focusTopic: trimmedTopic } : {}) },
                byokApiKey: byokApiKey.trim() || undefined,
                byokBaseUrl: byokBaseUrl.trim() || undefined,
                byokModel: byokModel.trim() || undefined,
                requestedVisibility: (shareWithOthers ? 'SHARED' : 'PRIVATE') as 'SHARED' | 'PRIVATE',
                paymentMethod,
                force: type === 'quiz' && quizGeneratedSourceIds.has(selected.sourceId) ? true : undefined,
            };

            const result = await generateAIContent(selected.sourceId, type, options);
            if (!result.content) {
                setError('Tạo nội dung AI thất bại, thử lại sau.');
                return;
            }

            if (type === 'summary') {
                setSummaryResult(result.content);
                return;
            }

            // Quiz: parse → tạo lesson ngay. parseAIQuizContent throw
            // AIGenerationError nếu output không thành quiz hợp lệ được —
            // rơi xuống catch chung, user bấm tạo lại.
            const draft = parseAIQuizContent(result.content);
            await onCreateQuizLesson(selected.chapterId, draft, selected.lessonTitle, result.servedFromCache);
            setQuizGeneratedSourceIds(prev => new Set(prev).add(selected.sourceId));
            onClose();
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi tạo nội dung bằng AI.');
            if (err instanceof AIGenerationError) setErrorCode(err.code);
        } finally {
            setLoading(false);
        }
    };

    const handleCopySummary = async () => {
        if (!summaryResult) return;
        try {
            await navigator.clipboard.writeText(summaryResult);
            setSummaryCopied(true);
        } catch {
            // clipboard bị chặn (permission/iframe) — không có gì để làm thêm
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-ink-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        {type === 'quiz' ? 'Tạo bài quiz bằng AI' : 'Tạo tóm tắt bằng AI'}
                    </DialogTitle>
                    <DialogDescription>
                        {type === 'quiz'
                            ? 'Chọn video nguồn — quiz sinh ra sẽ thành 1 bài học mới ngay trong chương của video đó.'
                            : 'Chọn video nguồn để AI tóm tắt nội dung.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Chuyển qua lại giữa 2 recipe không cần đóng dialog */}
                <div className="flex gap-1 p-1 bg-ink-page rounded-lg w-fit">
                    {(['quiz', 'summary'] as AIRecipeType[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => { setType(t); setError(null); setErrorCode(null); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                type === t ? 'bg-ink-panel text-ink-accent shadow-ink-sm' : 'text-ink-textMuted hover:text-ink-text'
                            }`}
                        >
                            {t === 'quiz' ? 'Quiz' : 'Tóm tắt'}
                        </button>
                    ))}
                </div>

                {videoOptions.length === 0 ? (
                    <p className="text-sm text-ink-textMuted bg-ink-page border border-ink-border rounded-lg p-3">
                        Space chưa có video nào từ link — thêm 1 bài học video trước, AI cần nguồn để tạo nội dung.
                    </p>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-ink-textMid mb-1">Video nguồn</label>
                            {/* 2026-09-04 — trước đây là <select> gốc: list xổ xuống không style
                                được (chrome trình duyệt), xấu mặc định trong khi dropdown "Video
                                nguồn" ở panel sửa lesson QUIZ đã được thay bằng listbox tự vẽ từ
                                trước (commit 7d6fe68) — dùng lại đúng component đó cho đồng nhất. */}
                            <VideoSourceDropdown
                                options={videoOptions.map((v) => ({
                                    sourceId: v.sourceId,
                                    label: `${v.chapterTitle} — ${v.lessonTitle}`,
                                }))}
                                selectedSourceId={selected?.sourceId ?? videoOptions[0].sourceId}
                                onChange={(sourceId) => {
                                    const match = videoOptions.find(v => v.sourceId === sourceId);
                                    if (match) setSelectedLessonId(match.lessonId);
                                }}
                            />
                        </div>

                        <div className="p-3 rounded-lg bg-ink-accentA border border-ink-border space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-ink-textMid">
                                    Tuỳ biến {type === 'quiz' ? 'quiz' : 'tóm tắt'}
                                </span>
                                {/* Badge sống — cập nhật ngay theo giá trị đang chọn, thay vì 1
                                    dòng chữ tĩnh coi "mở panel tuỳ biến" = "sẽ tốn phí" (sai: để
                                    nguyên mặc định vẫn miễn phí, xem isDefaultParams/isFree phía trên). */}
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                        isFree
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isFree ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {isFree ? (hasFullByok && !isDefaultParams ? 'Miễn phí — dùng key riêng' : 'Miễn phí') : 'Cần BYOK hoặc trả phí'}
                                </span>
                            </div>

                            {type === 'quiz' ? (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-medium text-ink-textDim mb-1">Số câu</label>
                                        <div className="flex gap-1.5">
                                            {[5, 10, 15, 20].map((n) => (
                                                <button
                                                    key={n}
                                                    type="button"
                                                    onClick={() => setQuestionCount(n)}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                                        questionCount === n
                                                            ? 'bg-ink-accent text-white border-ink-accent'
                                                            : 'bg-ink-panel text-ink-text border-ink-border hover:border-ink-accent'
                                                    }`}
                                                >
                                                    {n} câu
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-ink-textDim mb-1">Độ khó</label>
                                        <div className="flex gap-1.5">
                                            {[{ v: 'easy', l: 'Dễ' }, { v: 'medium', l: 'Trung bình' }, { v: 'hard', l: 'Khó' }].map((opt) => (
                                                <button
                                                    key={opt.v}
                                                    type="button"
                                                    onClick={() => setDifficulty(opt.v)}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                                        difficulty === opt.v
                                                            ? 'bg-ink-accent text-white border-ink-accent'
                                                            : 'bg-ink-panel text-ink-text border-ink-border hover:border-ink-accent'
                                                    }`}
                                                >
                                                    {opt.l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-[11px] font-medium text-ink-textDim mb-1">Độ dài</label>
                                    <div className="flex gap-1.5">
                                        {[{ v: 'short', l: 'Ngắn' }, { v: 'standard', l: 'Chuẩn' }, { v: 'long', l: 'Dài' }].map((opt) => (
                                            <button
                                                key={opt.v}
                                                type="button"
                                                onClick={() => setLength(opt.v)}
                                                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                                    length === opt.v
                                                        ? 'bg-ink-accent text-white border-ink-accent'
                                                        : 'bg-ink-panel text-ink-text border-ink-border hover:border-ink-accent'
                                                }`}
                                            >
                                                {opt.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-medium text-ink-textDim mb-1">Chủ đề muốn tập trung (tuỳ chọn)</label>
                                <input
                                    type="text"
                                    value={focusTopic}
                                    onChange={(e) => setFocusTopic(e.target.value)}
                                    placeholder="vd: phần useEffect"
                                    // 2026-09-04 — trình duyệt tự autofill email/địa chỉ đã lưu vào ô text
                                    // trống này (không liên quan gì tới "chủ đề"), khiến params tự nhiên
                                    // lệch khỏi DEFAULT_RECIPE_PARAMS ngoài ý muốn user → rơi vào nhánh
                                    // "cần BYOK hoặc trả phí" dù họ chỉ định dùng bản mặc định.
                                    autoComplete="off"
                                    className="w-full px-2.5 py-1.5 text-xs border border-ink-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ink-accent"
                                />
                            </div>

                            {/* BYOK gấp lại mặc định (ít dùng, 3 ô + checkbox) — mở ra khi cần
                                thay vì luôn chiếm chỗ, giảm cảm giác "tường input" cho người chỉ
                                muốn đổi số câu/độ khó rồi trả phí bằng credit. */}
                            <div className="border-t border-ink-border/60 pt-2.5">
                                <button
                                    type="button"
                                    onClick={() => setByokOpen((o) => !o)}
                                    className="flex items-center gap-1.5 text-[11px] font-medium text-ink-accent hover:text-ink-accent/80"
                                    aria-expanded={byokOpen}
                                >
                                    <svg
                                        className={`w-3 h-3 shrink-0 transition-transform ${byokOpen ? 'rotate-90' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                    </svg>
                                    Dùng key riêng (BYOK) để tuỳ biến miễn phí
                                </button>

                                {byokOpen && (
                                    <div className="mt-2 space-y-2">
                                        <p className="text-[11px] text-ink-textMuted">
                                            Điền đủ 3 ô để tuỳ biến không tốn phí. Bỏ trống thì bản tuỳ biến sẽ cần trả phí bằng credit.
                                        </p>
                                        <div>
                                            <label className="block text-[11px] font-medium text-ink-textDim mb-1">API key</label>
                                            <input
                                                type="password"
                                                value={byokApiKey}
                                                onChange={(e) => setByokApiKey(e.target.value)}
                                                placeholder="API key"
                                                autoComplete="off"
                                                className="w-full px-2.5 py-1.5 text-xs border border-ink-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ink-accent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-ink-textDim mb-1">Endpoint</label>
                                            <input
                                                type="text"
                                                value={byokBaseUrl}
                                                onChange={(e) => setByokBaseUrl(e.target.value)}
                                                placeholder="vd: https://api.groq.com/openai/v1"
                                                autoComplete="off"
                                                className="w-full px-2.5 py-1.5 text-xs border border-ink-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ink-accent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-ink-textDim mb-1">Tên model</label>
                                            <input
                                                type="text"
                                                value={byokModel}
                                                onChange={(e) => setByokModel(e.target.value)}
                                                placeholder="vd: llama-3.3-70b-versatile"
                                                autoComplete="off"
                                                className="w-full px-2.5 py-1.5 text-xs border border-ink-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ink-accent"
                                            />
                                        </div>
                                        <label className="flex items-center gap-1.5 text-[11px] text-ink-textMid">
                                            <input
                                                type="checkbox"
                                                checked={shareWithOthers}
                                                onChange={(e) => setShareWithOthers(e.target.checked)}
                                                className="rounded text-ink-accent focus:ring-ink-accent"
                                            />
                                            Chia sẻ bản này cho người khác dùng miễn phí (chỉ áp dụng khi dùng key riêng)
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => handleGenerate()}
                            disabled={loading || !selected}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-ink-accent text-white hover:bg-ink-accent/90 disabled:opacity-50 transition-colors"
                        >
                            {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {loading
                                ? (type === 'quiz' ? 'Đang tạo quiz…' : 'Đang tóm tắt…')
                                : (type === 'quiz' ? 'Tạo bài quiz ngay' : 'Tạo tóm tắt')}
                        </button>

                        {error && (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                                {error}
                                {/* Cùng cặp nhánh trả phí với panel cũ ở trang học (WP4.1) —
                                    chính sách tier do server quyết, UI chỉ mở đúng lối đi. */}
                                {errorCode === 'AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID' && (
                                    <button
                                        onClick={() => handleGenerate('CREDITS')}
                                        disabled={loading}
                                        className="mt-2 block px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                                    >
                                        Trả phí để nền tảng tạo giúp
                                    </button>
                                )}
                                {errorCode === 'AI_INSUFFICIENT_CREDITS' && (
                                    <Link
                                        href="/billing"
                                        className="mt-2 inline-block px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-amber-600 text-white hover:bg-amber-700"
                                    >
                                        Mua thêm credit
                                    </Link>
                                )}
                            </div>
                        )}

                        {type === 'summary' && summaryResult && (
                            <div className="p-3 rounded-lg bg-ink-page border border-ink-border">
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-xs font-semibold text-ink-textMuted">Tóm tắt — {selected?.lessonTitle}</p>
                                    <button
                                        onClick={handleCopySummary}
                                        className="text-[11px] font-medium text-ink-accent hover:text-ink-accent/80"
                                    >
                                        {summaryCopied ? 'Đã sao chép ✓' : 'Sao chép'}
                                    </button>
                                </div>
                                <MarkdownText text={summaryResult} className="text-sm text-ink-text max-h-60 overflow-y-auto" />
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
