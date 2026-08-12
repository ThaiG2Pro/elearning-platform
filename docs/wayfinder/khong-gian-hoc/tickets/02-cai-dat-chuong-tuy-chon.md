---
id: khong-gian-hoc/02
title: Cài đặt "chương tùy chọn" — chương mặc định ẩn hay migration nullable
label: wayfinder:grilling
status: open
assignee: null
blocked_by: [khong-gian-hoc/01]
---
## Question

Khái niệm đã chốt: chương là cách nhóm bài, tùy chọn (ADR-0001). Cài đặt chọn hướng nào: (a) giữ schema `lessons.chapter_id` bắt buộc, dùng chương mặc định ẩn ở UI; (b) migration cho lesson treo trực tiếp vào course (chapter_id nullable / bảng nối); (c) hướng khác. Quyết dựa trên facts từ ticket 01 (mức độ giả định về chapter trong code, chi phí migration, ảnh hưởng share/clone).
