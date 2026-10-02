// Nội dung chữ của /guide và /about — nguồn duy nhất, dùng chung bởi trang
// (render JSX) và GET /api/v1/support/knowledge (kho tri thức cho AI CSKH,
// cùng cách làm với src/content/faq.ts). Sửa chữ ở đây là trang và bot cùng
// đổi; chạy lại ingest bên ai-agent-sale-v2 để bot thấy bản mới.
//
// Quy ước: **tên nút** in đậm đúng chữ trên màn hình (trang render thành
// <strong>, bot giữ nguyên dấu ** vì đọc hiểu được).

export interface GuideStep {
    id: string;
    title: string;
    /** Mỗi phần tử là một đoạn <p>. */
    paragraphs: string[];
}

export const GUIDE_INTRO =
    'Năm bước từ một cái link tới một Space học xong. Chữ in đậm là tên nút đúng như trên màn hình.';

export const GUIDE_STEPS: GuideStep[] = [
    {
        id: 'dan-link',
        title: 'Dán link, tạo Space',
        paragraphs: [
            'Ở trang chủ, dán link video YouTube vào ô tạo nhanh. Hệ thống tự lấy tiêu đề, ảnh bìa và tạo Space đầu tiên cho bạn.',
            'Xong bước này bạn có hai lối: **Học ngay** để vào xem luôn, hoặc **Thêm quiz trước khi học** để soạn thêm ở bước 2.',
        ],
    },
    {
        id: 'sap-xep',
        title: 'Sắp xếp chương, bài học, thêm quiz',
        paragraphs: [
            'Trong màn hình chỉnh sửa Space, chia nội dung thành chương và bài học theo thứ tự bạn muốn. Mỗi bài là một video hoặc một quiz.',
            'Quiz có hai cách tạo: tự soạn bằng cách tải file câu hỏi lên, hoặc bấm **AI tạo quiz cho bài này** để soạn từ chính video trong Space.',
        ],
    },
    {
        id: 'vao-hoc',
        title: 'Vào học',
        paragraphs: [
            'Bật **Chế độ tập trung** để ẩn mọi thứ ngoài bài đang xem. Vị trí xem tự lưu, không cần bấm gì. Mở lại Space sau này sẽ vào đúng chỗ bạn dừng.',
            'Ghi chú ghi tại đúng mốc thời gian trong video. Bấm vào ghi chú để tua lại chỗ đó. Bài dạng quiz làm ngay trong bài học, bấm **Nộp bài** mới chấm điểm cả bài. Bài làm dở được giữ tạm trên máy nếu mất mạng giữa chừng.',
        ],
    },
    {
        id: 'tien-do',
        title: 'Xem lại tiến độ',
        paragraphs: [
            'Trang chủ có mục **Đang học** hiện các Space bạn học dở gần nhất. Vào **Học tiếp** trên thanh trên để xem toàn bộ Space với phần trăm hoàn thành thật, lọc theo chưa học, đang học, đã xong.',
        ],
    },
    {
        id: 'chia-se',
        title: 'Chia sẻ hoặc sao chép Space',
        paragraphs: [
            'Chủ Space bấm **Chia sẻ** để lấy link. Người nhận xem ngay, không cần tài khoản, nhưng tiến độ không được lưu.',
            'Muốn giữ một bản riêng để chỉnh sửa và lưu tiến độ, bấm **Sao chép về học**. Bước này cần đăng nhập. Ai sao chép cùng một Space sẽ thấy tiến độ của nhau ở mục **Cùng học**.',
        ],
    },
];

export interface InfoRow {
    label: string;
    body: string;
    /** Dẫn về /faq#<id> nếu ở đó có giải thích dài hơn. */
    faqId?: string;
}

// Giới hạn thật của bản hiện tại (/guide).
export const GUIDE_LIMITS: InfoRow[] = [
    {
        label: 'Nguồn hỗ trợ',
        body: 'Hiện chỉ nhận link YouTube, mỗi lần một video. Chưa dán được nguyên playlist, bạn dán từng link rồi sắp vào chương.',
    },
    {
        label: 'AI miễn phí',
        body: 'Quiz theo cấu hình chuẩn miễn phí, có giới hạn lượt mỗi ngày và độ dài video.',
        faqId: 'gioi-han-ngay',
    },
    {
        label: 'AI theo yêu cầu riêng',
        body: 'Đổi độ dài, giọng văn, số câu thì cần API key AI của bạn hoặc trả bằng credit.',
        faqId: 'co-mat-phi-khong',
    },
    {
        label: 'Sao chép Space',
        body: 'Nội dung AI mà chủ Space gốc trả credit để tạo riêng không đi theo bản sao. Người sao chép tạo lại nếu cần.',
        faqId: 'clone-space',
    },
];

// /about — slogan, câu chuyện founder (nguyên văn đã rà 2026-09-11), Space.
export const ABOUT = {
    slogan: 'Xem đến đâu, nhớ đến đó. Chỉ cần link.',
    intro: 'Dán một link YouTube là có một chỗ để học nó nghiêm túc: ghi chú theo mốc thời gian, quiz tự kiểm tra, tiến độ tự lưu.',
    storyLead:
        'Trước khi làm sản phẩm này, tôi học theo cách hầu hết mọi người đang học: mở một video, ghi chú vào một chỗ khác, xem xong thì chuyển sang video kế tiếp.',
    story: [
        'Nhưng cái tôi chuyển sang phần nhiều là do YouTube gợi ý. Một tiêu đề giật hơn, một chủ đề chẳng liên quan, đôi khi là quảng cáo chen ngang. Lần sau quay lại, lịch sử xem lẫn lộn giữa video học nghiêm túc và video xem cho vui, chẳng còn cách nào lọc ra đâu là buổi mình thật sự đang học.',
        'Kiến thức miễn phí không thiếu. Thiếu là một chỗ để học nó nghiêm túc. Nên tôi làm ra chỗ đó cho chính mình học trước, và giờ vẫn đang dùng nó mỗi ngày.',
    ],
    spaceTitle: 'Ý nào nảy ra lúc đang xem, giữ ngay tại đó',
    spaceBody:
        'Ghi chú gắn vào đúng giây đang xem, bấm vào là tua lại. Cần tập trung hơn thì gạt hết phần còn lại, chỉ còn video và ghi chú của bạn.',
} as const;

// Những điều nền tảng giữ với người học (/about).
export const PROMISES: InfoRow[] = [
    {
        label: 'Miễn phí để học',
        body: 'Tạo Space, xem, ghi chú, làm quiz, theo dõi tiến độ không mất tiền. Chỉ trả khi muốn AI tạo nội dung theo yêu cầu riêng mà không dùng key của bạn.',
        faqId: 'co-mat-phi-khong',
    },
    {
        label: 'Không quảng cáo chen ngang',
        body: 'Trong Space chỉ có video của bạn, ghi chú của bạn và bài quiz. Không gợi ý video khác, không banner.',
    },
    {
        label: 'Dữ liệu là của bạn',
        body: 'Tải về một bản JSON đầy đủ hồ sơ, Space, tiến độ, ghi chú bất cứ lúc nào. Xoá tài khoản là xoá thật.',
        faqId: 'xoa-tk',
    },
    {
        label: 'Không học một mình',
        body: 'Chia sẻ Space cho bạn bè. Ai sao chép cùng một Space thấy tiến độ của nhau, dù mỗi người học trên bản riêng.',
        faqId: 'chia-se-space',
    },
];
