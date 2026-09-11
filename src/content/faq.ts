// Nguồn dữ liệu FAQ DUY NHẤT — dùng chung bởi SalesAgentWidget (chat menu)
// và trang /faq (trang tĩnh, crawl được). Tách ra khỏi SalesAgentWidget.tsx
// để 2 nơi không lặp/lệch nội dung. Câu trả lời đã đối chiếu với code thật
// (AIGenerationPolicy, CreditLedger, auth, space clone/share) — xem commit
// "chatbot FAQ thật (không AI)". Cố tình KHÔNG nêu số credit/ngưỡng chính
// xác cho mỗi lần AI tạo (VD "10 credit") vì đó là hằng số cấu hình qua env
// (AI_GENERATION_CREDIT_COST), có thể đổi mà không sửa code — nêu cứng ở
// trang public sẽ có ngày sai mà không ai nhớ sửa.

export type TopicId = 'tinh-nang' | 'gia-credit' | 'tai-khoan' | 'ho-tro';

export interface FaqQuestion {
    id: string;
    label: string;
    answer: string;
    keywords: string[];
    related?: string[]; // id của câu hỏi liên quan (cùng hoặc khác topic)
}

export interface FaqTopic {
    id: TopicId;
    label: string;
    /** true = bấm vào topic đi thẳng tới escalation, không liệt kê câu hỏi con. */
    directEscalate?: boolean;
    questions: FaqQuestion[];
}

export const FAQ_TOPICS: FaqTopic[] = [
    {
        id: 'tinh-nang',
        label: '🎯 Tính năng nền tảng',
        questions: [
            {
                id: 'nen-tang-co-gi',
                label: 'Nền tảng có gì đặc biệt?',
                answer: 'Bạn dán 1 link YouTube (hoặc trang web) là có ngay một không gian học riêng. Khi cần, bạn bấm nút để AI tóm tắt nội dung hoặc tạo quiz ôn tập — cộng thêm theo dõi tiến độ học của bạn.',
                keywords: ['đặc biệt', 'tính năng', 'giới thiệu', 'nền tảng', 'là gì'],
                related: ['bat-dau-hoc'],
            },
            {
                id: 'bat-dau-hoc',
                label: 'Bắt đầu học thế nào?',
                answer: 'Chỉ cần tạo tài khoản miễn phí, dán link video/bài viết muốn học vào — hệ thống tự tạo Space học cho bạn, không cần cài đặt gì thêm.',
                keywords: ['bắt đầu', 'mới bắt đầu', 'cách dùng', 'hướng dẫn', 'sử dụng'],
                related: ['nen-tang-co-gi', 'ai-mien-phi'],
            },
            {
                id: 'clone-space',
                label: 'Sao chép (clone) Space người khác được không?',
                answer: 'Được — bấm "Sao chép về học" trên Space công khai để tạo bản riêng, chỉnh sửa thoải mái, độc lập hoàn toàn với bản gốc. Cần đăng nhập để sao chép (xem thì không cần, nhưng sao chép thì có).\n\nLưu ý: nội dung AI được tạo riêng theo yêu cầu tuỳ biến (trả phí) của chủ Space gốc sẽ không tự động sao chép sang — bạn cần tạo lại nếu cần.',
                keywords: ['clone', 'sao chép', 'nhân bản', 'fork'],
                related: ['chia-se-space'],
            },
            {
                id: 'chia-se-space',
                label: 'Chia sẻ Space cho người chưa có tài khoản được không?',
                answer: 'Được — bạn dùng link chia sẻ, người nhận xem được ngay mà không cần đăng ký tài khoản.',
                keywords: ['chia sẻ', 'share', 'link chia sẻ', 'không có tài khoản'],
                related: ['clone-space'],
            },
        ],
    },
    {
        id: 'gia-credit',
        label: '💰 Giá & Credit AI',
        questions: [
            {
                id: 'co-mat-phi-khong',
                label: 'Dùng có mất phí không?',
                answer: 'Học, tạo Space, làm quiz, ghi chú, theo dõi tiến độ — hoàn toàn miễn phí. Bạn chỉ cần credit khi muốn AI tạo nội dung theo yêu cầu tuỳ biến riêng (đổi độ dài, giọng văn…) mà không dùng API key AI của chính mình.',
                keywords: ['mất phí', 'miễn phí', 'free', 'giá', 'trả phí'],
                related: ['credit-la-gi', 'ai-mien-phi'],
            },
            {
                id: 'credit-la-gi',
                label: 'Credit là gì, mua sao?',
                answer: 'Credit dùng để AI tạo nội dung tuỳ biến theo yêu cầu riêng của bạn. Có 3 gói:\n\n• 20 credit — $1.99\n• 120 credit — $9.99\n• 300 credit — $19.99\n\nMỗi lần tạo AI tuỳ biến sẽ trừ một lượng nhỏ credit.',
                keywords: ['credit', 'mua credit', 'nạp credit', 'gói credit', 'thanh toán'],
                related: ['co-mat-phi-khong', 'hoan-tien'],
            },
            {
                id: 'ai-mien-phi',
                label: 'Có cách nào dùng AI miễn phí không?',
                answer: 'Có 2 cách hoàn toàn miễn phí:\n\n• Dùng cấu hình AI mặc định (tóm tắt/quiz chuẩn).\n• Nhập API key AI của riêng bạn (BYOK) để tuỳ biến thoải mái mà không tốn credit.',
                keywords: ['ai miễn phí', 'byok', 'api key', 'không tốn credit', 'key riêng'],
                related: ['video-dai', 'gioi-han-ngay'],
            },
            {
                id: 'video-dai',
                label: 'Video dài có tạo AI miễn phí được không?',
                answer: 'Với chế độ AI miễn phí dùng chung, video quá dài sẽ cần bạn dùng API key riêng hoặc dùng credit — để đảm bảo hệ thống phục vụ công bằng cho mọi người.',
                keywords: ['video dài', 'quá dài', 'giới hạn video', 'transcript dài'],
                related: ['ai-mien-phi'],
            },
            {
                id: 'gioi-han-ngay',
                label: 'Có giới hạn dùng AI mỗi ngày không?',
                answer: 'Có giới hạn số lượt kích hoạt AI mới mỗi ngày cho mỗi người, để tránh quá tải hệ thống. Nếu chạm giới hạn, bạn sẽ được báo rõ và có thể thử lại vào hôm sau, hoặc dùng API key riêng để không bị giới hạn.',
                keywords: ['giới hạn', 'mỗi ngày', 'quá tải', 'rate limit', 'hết lượt'],
                related: ['ai-mien-phi'],
            },
            {
                id: 'hoan-tien',
                label: 'Có hoàn tiền không?',
                answer: 'Hiện tại nền tảng chưa có chính sách hoàn tiền tự động. Nếu bạn gặp sự cố về thanh toán hoặc credit bị trừ sai, hãy liên hệ đội hỗ trợ — mỗi trường hợp sẽ được xem xét trực tiếp.',
                keywords: ['hoàn tiền', 'refund', 'trừ tiền oan', 'trừ nhầm', 'hoàn phí'],
                related: ['credit-la-gi'],
            },
        ],
    },
    {
        id: 'tai-khoan',
        label: '👤 Tài khoản & đăng nhập',
        questions: [
            {
                id: 'quen-mk',
                label: 'Quên mật khẩu?',
                answer: "Bạn vào trang đăng nhập, chọn 'Quên mật khẩu' — hệ thống sẽ gửi link đặt lại mật khẩu qua email đăng ký.",
                keywords: ['quên mật khẩu', 'quên pass', 'không đăng nhập được', 'reset mật khẩu'],
            },
            {
                id: 'khong-thay-email',
                label: 'Đăng ký xong không thấy email kích hoạt?',
                answer: 'Kiểm tra thử mục Spam/Quảng cáo nhé. Nếu vẫn không thấy, bạn có thể đăng ký lại ngay bằng đúng email đó — không cần chờ, hệ thống sẽ tự ghi đè lên lượt đăng ký chưa kích hoạt trước và gửi lại email kích hoạt mới.',
                keywords: ['không thấy email', 'email kích hoạt', 'chưa nhận được email', 'activation'],
            },
            {
                id: 'xoa-tk',
                label: 'Xoá tài khoản, dữ liệu có mất không?',
                answer: 'Bạn có thể tự xoá tài khoản trong trang **Hồ sơ cá nhân** (cần nhập lại mật khẩu để xác nhận). Trước khi xoá, bạn có thể tải về một bản JSON chứa toàn bộ dữ liệu cá nhân của mình (hồ sơ, Space, tiến độ học, ghi chú).',
                keywords: ['xoá tài khoản', 'xóa tài khoản', 'delete account', 'mất dữ liệu'],
            },
        ],
    },
    {
        id: 'ho-tro',
        label: '🆘 Tôi cần hỗ trợ / khiếu nại',
        directEscalate: true,
        questions: [],
    },
];

export const ALL_QUESTIONS: Record<string, FaqQuestion & { topicId: TopicId }> = Object.fromEntries(
    FAQ_TOPICS.flatMap((topic) => topic.questions.map((q) => [q.id, { ...q, topicId: topic.id }])),
);

export function findQuestionByFreeText(text: string): (FaqQuestion & { topicId: TopicId }) | null {
    const lower = text.toLowerCase();
    for (const q of Object.values(ALL_QUESTIONS)) {
        if (q.keywords.some((kw) => lower.includes(kw))) return q;
    }
    return null;
}
