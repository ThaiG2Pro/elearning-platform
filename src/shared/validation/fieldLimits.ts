// Security — title/fullName/URL không có giới hạn độ dài ở tầng
// DTO/service trước khi chạm Prisma. Cột DB tương ứng (VarChar) VẪN chặn
// được, nhưng theo 2 cách xấu:
//   1. Postgres trả lỗi thô (mã 22001 "value too long") — rơi vào catch
//      chung, dễ lộ chi tiết implementation nếu route không dùng
//      safeErrorMessage (Fix 5), và trả sai status (500 thay vì 400).
//   2. Payload khổng lồ (vd title/fullName dài hàng trăm nghìn ký tự)
//      vẫn được parse JSON, tạo transaction, hash bcrypt (fullName đi kèm
//      request register/update-profile)... trước khi bị DB từ chối — tốn
//      CPU/băng thông một cách vô ích, một dạng DoS nhỏ.
// Chặn sớm ở service, dùng đúng giới hạn cột DB (schema.prisma) để không
// đổi hành vi hợp lệ nào, chỉ chặn input vượt ngưỡng.
export const FIELD_LIMITS = {
    // spaces.title / chapters.title / lessons.title đều VarChar(255).
    TITLE: 255,
    // users.full_name VarChar(100).
    FULL_NAME: 100,
    // lessons.content_url VarChar(500).
    URL: 500,
} as const;

/** Throws `new Error(errorCode)` khi value vượt quá max ký tự. */
export function assertMaxLength(value: string, max: number, errorCode: string): void {
    if (value.length > max) {
        throw new Error(errorCode);
    }
}
