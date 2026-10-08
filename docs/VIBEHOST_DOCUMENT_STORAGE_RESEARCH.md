# Lưu hồ sơ ERP trên Vibe Host

Khảo sát ngày 2026-10-09. Phạm vi: đọc mã ERP/DGC và cấu hình đang hiển thị trên https://v2.tinhgon.xyz; chưa thay đổi cấu hình, upload tài sản, triển khai hay khôi phục dữ liệu.

## Kết quả xác minh

- API `erp-core-web-staging` có đúng một thư mục lưu trữ riêng `/app/storage`, đang hiển thị 13 KB. Trang Cài đặt nói các thư mục khai báo được giữ qua cập nhật; thay đổi danh sách chỉ có hiệu lực sau triển khai lại. Cấu hình này đã được triển khai và kiểm tra giữ nguyên marker qua redeploy trong `STAGING_INFRASTRUCTURE_ACCEPTANCE.md`.
- UI `erp-core-staging-ui` chỉ gọi API. File nghiệp vụ phải đi qua API và lưu tại storage API.
- Trang Dung lượng là bảng sử dụng dung lượng; chưa thấy trình quản lý file hoặc nút upload tài sản tại các trang đã khảo sát. Gói 10 GB dùng chung cho bản build, source, file ứng dụng, database và backup.
- Sao lưu API: database hằng ngày 02:00, giữ 7 bản; dữ liệu ứng dụng hằng ngày 04:00, giữ 3 bản (giới hạn hiển thị tối đa 3). Đây là giờ hiển thị của dashboard, chưa xác minh múi giờ scheduler.
- Đã có một bản sao lưu dữ liệu ứng dụng tự động ngày 08/10/2026, 228 B, báo `Đã sao lưu 1/1 thư mục`, trạng thái Thành công. Bản nhỏ này không chứng minh các tài sản GST đã được upload hay có thể phục hồi toàn bộ hồ sơ.
- Provider mô tả backup file là bản chụp NÓNG: ứng dụng không dừng và có thể sao lưu tệp đang ghi dở. Database và file được sao lưu riêng, không có bằng chứng một snapshot nhất quán chung.
- Kiểm tra phục hồi PostgreSQL trước đây không phải kiểm tra phục hồi file. Chưa thử restore backup file vào môi trường độc lập.

Nguồn UI: [Cài đặt API](https://v2.tinhgon.xyz/projects/cmuxx3m5w1s8b0j5f5q9yz2rk/settings), [Sao lưu](https://v2.tinhgon.xyz/backups), [Dung lượng](https://v2.tinhgon.xyz/storage).

## Cơ chế DGC phải kế thừa

Donor v61, `11_Documents_Drive.js`: file lưu Google Drive; bảng nghiệp vụ giữ File_ID/File_URL và các liên kết hồ sơ. Hàm `DGC_getManagedDocumentFolder_` tổ chức theo loại chứng từ / đối tác / năm / kỳ / thư mục con. Chưa có kỳ thì đưa vào `00_Inbox`.

| Nhóm DGC | Loại hồ sơ |
| --- | --- |
| 01_Reconciliation | PDF_Statement, Signed_Copy, Input_Reconciliation, SOA |
| 02_Invoices | Invoice |
| 03_Payments | SWIFT, Bank_Receipt |
| 04_Contracts | Hợp đồng |
| 05_Reports | Báo cáo |
| 99_Archive | Hồ sơ khác |

`41_Invoice_PDF.js` tham chiếu PDF Invoice từ `51_INVOICES.Attachment_URL`, đối soát từ `42_RECON_PDF_UPLOAD.File_ID/File_URL`; overlay tạo file kết quả riêng và liên kết hồ sơ. Việc đổi Google Drive sang storage Vibe Host không được làm mất phân loại, nguồn gốc, liên kết hay nghiệp vụ. Luồng đối soát hiện được yêu cầu: upload → preview scan/kết quả, chốt và chèn tài sản ký → tạo Invoice; xem `DGC_OUTPUT_RECON_CORRECTED_WORKFLOW.md`.

## ERP đang có gì

- Adapter hiện tại chỉ hỗ trợ `STORAGE_PROVIDER=local`; production yêu cầu `STORAGE_ROOT` tuyệt đối. Đích staging là `/app/storage`.
- PDF đối soát gốc lưu `output-recon/{companyId}/{attachmentId}.pdf`; chứng từ dự án lưu `documents/{companyId}/{attachmentId}.pdf`.
- `Attachment` giữ đường dẫn, tên gốc, MIME, kích thước, SHA-256, người upload và thời điểm. `Document` có loại, thực thể liên quan, trạng thái, phiên bản; `AuditLog` ghi hành động.
- Upload PDF tối đa 5 MB; kiểm tra trùng theo nguồn và hồ sơ. File được tạo độc quyền, tên UUID; nếu transaction database thất bại thì xoá file mới. Đây chưa phải transaction nguyên tử giữa database và filesystem: mất tiến trình vẫn có thể để lại file mồ côi.
- Download/preview qua endpoint có đăng nhập và quyền của công ty; kiểm tra đường dẫn, loại file thường, kích thước, checksum. Không cung cấp `/app/storage` như thư mục web công khai.
- File OCR/ảnh preview tạm được dọn sau xử lý; không coi chúng là chứng từ lưu dài hạn.
- Storage local bị bỏ qua bởi `.gitignore` và `.dockerignore`. Commit/push/redeploy không đưa tài sản local vào storage staging.

Logo GST, ảnh ghép dấu/chữ ký/chức danh và template XLSM đã lưu trong `D:\Projects\ERP-CORE-WEB\storage`, có checksum và metadata; hiện chưa upload staging. Chưa có chức năng quản trị upload/phiên bản các tài sản này, hoặc cơ chế hoàn chỉnh lưu PDF đã chốt và Invoice theo luồng mới.

## Thiết kế tiếp theo

Tiếp tục dùng persistent storage API hiện có. Database giữ chỉ mục và liên kết; file giữ trong `/app/storage`. Không cần thêm database hay một storage mới chỉ để triển khai chức năng này.

| Nội dung | Vị trí dưới /app/storage | Trạng thái |
| --- | --- | --- |
| PDF đối soát gốc | output-recon/{companyId}/{UUID}.pdf | Đã có |
| Chứng từ dự án | documents/{companyId}/{UUID}.pdf | Đã có |
| PDF đối soát chốt/đóng dấu | recon-final/{companyId}/{UUID}.pdf | Đề xuất |
| Invoice PDF và bản xuất liên quan | invoices/{companyId}/{UUID}.{ext} | Đề xuất |
| Logo, dấu/chữ ký/chức danh | company-assets/{companyId}/... | Có local, cần upload/version staging |
| Template Invoice | invoice-templates/{companyId}/... | Có local, cần upload/version staging |
| Hợp đồng, SOA, SWIFT, thanh toán, báo cáo | mở rộng kho chứng từ dùng chung | Chưa xác nhận runtime đầy đủ |

Tên vật lý dùng UUID. Giao diện quản lý hiển thị loại chứng từ → đối tác → năm/kỳ tương ứng cấu trúc DGC, từ metadata; không đổi đường dẫn file gốc đang có. Bản gốc bất biến, bản chốt và mỗi lần phát hành Invoice là file/phiên bản riêng. Lưu liên kết về nguồn PDF, kết quả tài chính đã chốt, template và tài sản ký đã dùng, checksum, người và thời điểm chốt. Thay template/logo sau này không được tự đổi Invoice cũ.

Cần chức năng upload tài sản/template theo quyền quản trị, download theo quyền nghiệp vụ, lịch sử phiên bản và tra cứu hồ sơ. Khi chốt, tạo file tạm hoàn chỉnh rồi rename sang tên cuối trên cùng filesystem trước khi công bố metadata; không sửa trực tiếp file đã chốt. Bổ sung kiểm tra file thiếu/mồ côi và quy trình xử lý, không tự xoá chứng từ đang tham chiếu.

## Sao lưu và nghiệm thu

1. Backup cả database và dữ liệu ứng dụng. Hai lịch 02:00/04:00 hiện tại không đảm bảo dữ liệu cùng thời điểm; cần checkpoint có kiểm soát khi nâng cấp hoặc khôi phục hồ sơ tài chính.
2. Với checkpoint: tạm ngừng ghi chứng từ, chờ job hoàn tất, tạo manifest đường dẫn/kích thước/SHA-256, chụp database và file, rồi mở ghi lại. Cùng một nhãn checkpoint và phiên bản ứng dụng. Đây là đề xuất, chưa triển khai.
3. Thử restore cặp backup vào môi trường độc lập; đối chiếu tất cả Attachment với file, kiểm tra checksum và mở PDF gốc/bản ký/Invoice, xác minh quyền công ty. Không thử restore đè staging.
4. Giữ một bản backup độc lập ngoài dịch vụ và giám sát quota. Xác nhận chính sách phục hồi khi mất host với provider; việc giữ file qua redeploy không chứng minh khả năng khôi phục khi mất máy chủ.
5. Nghiệm thu một hồ sơ đủ chuỗi upload → chốt/đóng dấu → Invoice; redeploy vẫn tải được mọi phiên bản, thay template không làm đổi hồ sơ cũ, rồi restore độc lập đạt checksum.

Object storage S3-compatible là hướng mở rộng nếu chạy nhiều API hoặc tăng dung lượng. Chưa xác nhận Vibe Host cung cấp dịch vụ này; không tự suy diễn từ tên nhà cung cấp khác.
