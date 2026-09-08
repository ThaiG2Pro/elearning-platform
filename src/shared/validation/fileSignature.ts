// Security — kiểm tra "magic bytes" thay vì chỉ tin tên file. Trước đây cả
// 2 route upload/parse Excel chỉ kiểm `file.name.endsWith('.xlsx')`, một
// điều kiện client hoàn toàn tự khai báo (đổi tên bất kỳ file nào thành
// "a.xlsx" là qua được check). File đó sau đó được đưa thẳng vào thư viện
// đọc Excel (xlsx/exceljs...) — parser cho các định dạng phức tạp là bề mặt
// tấn công lớn (zip-bomb, XML entity injection, parser bug) nếu nhận input
// không đúng định dạng nó tưởng đang đọc.
//
// .xlsx là file ZIP (OOXML), luôn bắt đầu bằng magic bytes "PK\x03\x04".
// Kiểm 4 byte đầu là rẻ (chỉ đọc phần đầu file, không cần buffer toàn bộ)
// và loại được ngay các file rõ ràng sai định dạng trước khi chạm tới
// parser — không phải kiểm định content-sniffing đầy đủ nhưng chặn được
// lớp tấn công "đổi tên file" rẻ tiền nhất.
const XLSX_MAGIC_BYTES = [0x50, 0x4b, 0x03, 0x04] as const;

export async function hasXlsxMagicBytes(file: File): Promise<boolean> {
    const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (header.length < XLSX_MAGIC_BYTES.length) return false;
    return XLSX_MAGIC_BYTES.every((byte, i) => header[i] === byte);
}
