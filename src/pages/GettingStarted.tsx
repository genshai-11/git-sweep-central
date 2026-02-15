import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Terminal, Search, BarChart3, Star, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group">
      <pre className="rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => {
          navigator.clipboard.writeText(code);
          toast.success("Copied to clipboard");
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

const steps = [
  {
    icon: CheckCircle2,
    title: "1. Đăng ký tài khoản",
    description: "Tạo tài khoản trên web dashboard này. Bạn đã hoàn thành bước này nếu đang đọc trang này!",
    content: (
      <p className="text-sm text-muted-foreground">
        Truy cập trang đăng nhập, nhập email và mật khẩu để tạo tài khoản. Xác nhận email nếu được yêu cầu.
      </p>
    ),
  },
  {
    icon: Terminal,
    title: "2. Cài đặt CLI",
    description: "Cài đặt công cụ dòng lệnh Git-Sweepher trên máy tính.",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Cài đặt global qua npm:
        </p>
        <CodeBlock code="npm install -g git-sweepher" />
        <p className="text-sm text-muted-foreground">
          Hoặc chạy trực tiếp với npx (không cần cài):
        </p>
        <CodeBlock code="npx git-sweepher --help" />
        <p className="text-sm text-muted-foreground">
          Yêu cầu Node.js 18+. Kiểm tra cài đặt:
        </p>
        <CodeBlock code="git-sweepher --version" />
      </div>
    ),
  },
  {
    icon: GitBranch,
    title: "3. Đăng nhập CLI",
    description: "Kết nối CLI với tài khoản web dashboard của bạn.",
    content: (
      <div className="space-y-3">
        <CodeBlock code="git-sweepher login" />
        <p className="text-sm text-muted-foreground">
          Nhập email và mật khẩu đã đăng ký ở bước 1. CLI sẽ lưu token xác thực để sử dụng cho các lần sau.
        </p>
      </div>
    ),
  },
  {
    icon: Search,
    title: "4. Quét repositories",
    description: "Scan tất cả git repos trên máy và đồng bộ lên dashboard.",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Scan toàn bộ thư mục chứa projects:</p>
        <CodeBlock code="git-sweepher scan ~/Projects" />
        <p className="text-sm text-muted-foreground">Hoặc scan một thư mục cụ thể:</p>
        <CodeBlock code="git-sweepher scan ~/Projects/my-app" />
        <p className="text-sm text-muted-foreground">
          CLI sẽ tìm tất cả thư mục <code className="font-mono text-primary">.git</code>, thu thập metadata
          (tên, remote URL, sync status, dung lượng) và gửi lên database.
        </p>
      </div>
    ),
  },
  {
    icon: BarChart3,
    title: "5. Xem kết quả trên Dashboard",
    description: "Mở trang Dashboard để xem tổng quan repositories.",
    content: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Sau khi scan xong, quay lại trang <strong>Dashboard</strong> để xem:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tổng số repo, dung lượng, trạng thái sync</li>
          <li>Biểu đồ phân bổ theo account (GitHub/GitLab)</li>
          <li>Cảnh báo repo có thay đổi chưa commit</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Star,
    title: "6. Các thao tác khác",
    description: "Push, xóa local, star repo từ CLI.",
    content: (
      <div className="space-y-3">
        <CodeBlock
          code={`# Push code lên remote
git-sweepher push my-repo

# Xóa thư mục local (giải phóng ổ đĩa)
git-sweepher delete my-repo

# Đánh dấu repo quan trọng
git-sweepher star my-repo

# Clone repo đã lưu
git-sweepher clone my-repo`}
        />
        <p className="text-sm text-muted-foreground">
          Mỗi thao tác sẽ được ghi lại trong trang <strong>History</strong>.
        </p>
      </div>
    ),
  },
];

export default function GettingStarted() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Getting Started</h1>
        <p className="text-sm text-muted-foreground">
          Hướng dẫn từng bước để bắt đầu sử dụng Git-Sweepher
        </p>
      </div>

      {/* API Endpoint Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            API Endpoint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            CLI gửi dữ liệu scan qua endpoint:
          </p>
          <CodeBlock code="POST /functions/v1/cli-sync" />
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="font-mono text-xs">Auth: Bearer token</Badge>
            <Badge variant="outline" className="font-mono text-xs">Content-Type: application/json</Badge>
          </div>
          <details className="mt-3">
            <summary className="text-sm font-medium cursor-pointer hover:text-primary transition-colors">
              Xem payload mẫu
            </summary>
            <div className="mt-2">
              <CodeBlock
                code={JSON.stringify(
                  {
                    repositories: [
                      {
                        name: "my-app",
                        local_path: "/home/user/Projects/my-app",
                        remote_url: "https://github.com/user/my-app.git",
                        account: "github/user",
                        sync_status: "synced",
                        size_bytes: 5242880,
                        exists_locally: true,
                      },
                    ],
                  },
                  null,
                  2
                )}
              />
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <step.icon className="h-4 w-4 text-primary" />
                {step.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </CardHeader>
            <CardContent>{step.content}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
