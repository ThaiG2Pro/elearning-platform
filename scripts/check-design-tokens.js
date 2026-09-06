#!/usr/bin/env node
// Guard chống tái phát cho design tokens (xem README ở cuối file).
//
// Toàn app chỉ nên có 1 nguồn màu: `ink-*` (Tailwind class) / `T.*` (object
// trong src/lib/vibe/theme.ts) — cả hai cùng đọc từ :root{--ink-*} trong
// src/app/globals.css. Script này CHẶN việc thêm mới các class màu Tailwind
// mặc định (bg-blue-500, text-emerald-700, border-amber-300...): mỗi chỗ như
// vậy là một điểm "tự chọn màu tay" ngoài tầm --ink-*, và sẽ lệch tông dần
// theo thời gian — đúng vấn đề đã xảy ra trước khi dọn tokens (xem hội thoại
// gốc: "cả app đang mất sync, rất khó quản lý chuẩn").
//
// Cách hoạt động:
//   - design-tokens-baseline.json ghi số vi phạm CÒN LẠI của từng file nợ cũ
//     (18 file raw-Tailwind-color chưa migrate tại thời điểm viết script).
//   - Fail nếu một file NGOÀI baseline xuất hiện vi phạm mới (code mới viết
//     thêm màu thô), hoặc một file TRONG baseline có số vi phạm TĂNG (thêm
//     màu thô vào file đã có nợ cũ thay vì dùng ink-*).
//   - Số vi phạm GIẢM (đã migrate bớt) luôn qua — nhưng baseline không tự
//     giảm theo, nên chạy `node scripts/check-design-tokens.js --update` sau
//     khi migrate xong 1 file để khoá lại mức nợ mới, tránh phình ngược lại
//     mà không bị chặn.
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASELINE_PATH = path.join(__dirname, 'design-tokens-baseline.json');

// prefix Tailwind áp màu + tên màu palette mặc định — bất kỳ tổ hợp nào ở
// đây trên độ đậm 2-3 chữ số (bg-blue-500, text-emerald-700/80...) đều nên
// là một token ink-* thay vì tự chọn màu palette gốc của Tailwind.
const PATTERN =
  /(bg|text|border|from|to|via|ring|fill|stroke|divide|outline|decoration|placeholder|caret|accent|shadow)-(red|blue|green|emerald|amber|yellow|indigo|purple|violet|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|orange|lime|teal|cyan|sky)-[0-9]{2,3}/g;

function listSourceFiles() {
  const out = execSync(
    `grep -rlE '${PATTERN.source}' --include=*.tsx --include=*.ts src`,
    { cwd: ROOT, encoding: 'utf8' }
  ).trim();
  return out ? out.split('\n') : [];
}

function countViolations() {
  const current = {};
  for (const rel of listSourceFiles()) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const matches = content.match(PATTERN) || [];
    current[rel] = matches.length;
  }
  return current;
}

function loadRawBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return {};
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

// Baseline vừa là "nợ chờ migrate" vừa có thể chứa ghi chú ngoại lệ cố định
// (key bắt đầu bằng "_", ví dụ "_permanent_exceptions": { "path": "lý do" } —
// xem about/page.tsx, 4 icon trang trí). Các key "_" này KHÔNG tham gia so
// sánh vi phạm, chỉ để người đọc sau biết vì sao 1 file không giảm về 0.
function loadBaseline() {
  const json = loadRawBaseline();
  const counts = {};
  for (const [k, v] of Object.entries(json)) {
    if (!k.startsWith('_')) counts[k] = v;
  }
  return counts;
}

function main() {
  const current = countViolations();

  if (process.argv.includes('--update')) {
    const sorted = Object.fromEntries(Object.entries(current).sort());
    // Giữ nguyên mọi key "_" đã có (ví dụ _permanent_exceptions) — --update
    // chỉ ghi lại số đếm, không được xoá ghi chú ngoại lệ đã khai báo tay.
    const existingUnderscoreKeys = Object.fromEntries(
      Object.entries(loadRawBaseline()).filter(([k]) => k.startsWith('_') && k !== '_comment')
    );
    const body = {
      _comment:
        'Baseline nợ cũ raw-Tailwind-color — xem scripts/check-design-tokens.js. ' +
        'Cập nhật bằng: node scripts/check-design-tokens.js --update. ' +
        'Key "_permanent_exceptions" ghi những file KHÔNG cần giảm về 0 (có lý do, xem file đó).',
      ...existingUnderscoreKeys,
      ...sorted,
    };
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(body, null, 2) + '\n');
    const total = Object.values(sorted).reduce((a, b) => a + b, 0);
    console.log(`✓ Đã cập nhật ${path.relative(ROOT, BASELINE_PATH)} (${Object.keys(sorted).length} file, tổng ${total} vi phạm).`);
    return;
  }

  const baseline = loadBaseline();
  const allFiles = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  let hasFailure = false;
  let hasImprovement = false;

  for (const f of [...allFiles].sort()) {
    const base = baseline[f] || 0;
    const cur = current[f] || 0;
    if (cur > base) {
      hasFailure = true;
      if (base === 0) {
        console.error(
          `✘ ${f}: ${cur} class màu Tailwind thô MỚI (kiểu bg-blue-500) — dùng token ink-* ` +
          `(xem tailwind.config.js hoặc T.* trong src/lib/vibe/theme.ts) thay vì màu mặc định.`
        );
      } else {
        console.error(
          `✘ ${f}: tăng từ ${base} lên ${cur} vi phạm — đừng thêm màu thô mới vào file đã có nợ cũ, dùng ink-*.`
        );
      }
    } else if (cur < base) {
      hasImprovement = true;
      console.log(`ℹ ${f}: giảm từ ${base} xuống ${cur} vi phạm.`);
    }
  }

  if (hasImprovement) {
    console.log("\nCó file đã giảm vi phạm — chạy 'node scripts/check-design-tokens.js --update' để khoá lại mức nợ mới.");
  }

  if (hasFailure) {
    console.error('\nDesign tokens check FAILED — dùng bg-ink-*/text-ink-* (namespace trong tailwind.config.js) thay vì màu Tailwind mặc định.');
    process.exit(1);
  }
  console.log('✓ Design tokens check passed (không có vi phạm mới hoặc phình thêm so với baseline).');
}

main();
