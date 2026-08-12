---
id: khong-gian-hoc/03
title: Ghi xuất xứ playlist trong sources
label: wayfinder:grilling
status: open
assignee: null
blocked_by: []
---
## Question

Mô hình phải ghi nhận được "video này thuộc playlist nào" (chủ kênh tạo hay tự gom) mà không cam kết tự động hóa import (out of scope). Chốt: hình dạng dữ liệu trong `sources` (trường riêng vs `metadata` JSON: playlist_id, playlist_title, position?), phân biệt hai loại playlist có cần thiết không, và mức tối thiểu để import tự động sau này không phải migration.
