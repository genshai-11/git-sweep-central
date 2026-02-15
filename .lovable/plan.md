

## Git-Sweepher Web Dashboard

Giao diện web quản lý tập trung cho hệ thống Git-Sweepher, kết nối với Supabase làm backend để CLI Python gửi dữ liệu lên.

### 1. Trang Dashboard (Tổng quan)
- Thống kê tổng: số repo đã scan, dung lượng tổng, số repo chưa sync, số repo đã xóa
- Biểu đồ phân bổ repo theo account (GitHub/GitLab)
- Biểu đồ trạng thái sync (synced / unsynced / dirty)
- Danh sách cảnh báo: repo có thay đổi chưa commit

### 2. Trang Danh sách Repo
- Bảng hiển thị tất cả repo đã scan với các cột: tên repo, đường dẫn local, remote URL, account, trạng thái sync, lần scan cuối
- Bộ lọc theo: trạng thái sync, account, còn tồn tại local hay đã xóa
- Tìm kiếm theo tên repo
- Badge màu cho trạng thái: xanh (synced), vàng (behind), đỏ (dirty/uncommitted)

### 3. Trang Stars Gallery
- Hiển thị dạng card grid các repo được đánh dấu "star"
- Mỗi card gồm: tên repo, mô tả, URL, ngôn ngữ chính, tags
- Có thể thêm/xóa star, thêm ghi chú cá nhân cho từng repo
- Lọc và tìm kiếm trong collection

### 4. Trang Lịch sử Thao tác
- Timeline các hành động đã thực hiện: push, delete local, scan, star
- Mỗi entry gồm: thời gian, loại hành động, repo liên quan, kết quả (thành công/thất bại)
- Lọc theo loại hành động và khoảng thời gian

### 5. Backend (Supabase)
- Database tables: repositories, scan_history, starred_repos, action_logs
- API endpoint (Edge Function) để CLI Python gửi dữ liệu scan lên
- Row Level Security cho bảo mật dữ liệu
- Authentication để xác thực người dùng

### 6. Giao diện chung
- Sidebar navigation với các mục: Dashboard, Repos, Stars, History
- Responsive design, hỗ trợ dark mode
- Thanh trạng thái hiển thị lần scan gần nhất

