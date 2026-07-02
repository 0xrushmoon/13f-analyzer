import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/institutions",
    description: "获取机构列表",
    auth: true,
  },
  {
    method: "GET",
    path: "/api/v1/institutions/:cik/holdings?period=2025-Q3",
    description: "获取指定机构持仓",
    auth: true,
  },
  {
    method: "GET",
    path: "/api/v1/institutions/:cik/changes?period=2025-Q3",
    description: "获取季度持仓变化",
    auth: true,
  },
  {
    method: "POST",
    path: "/api/v1/analyze",
    description: "AI 分析（body: { cik, question, session_id? }）",
    auth: true,
  },
];

export default function DocsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">API 文档</h1>
      <p className="text-muted-foreground mb-8">
        Agent REST API 参考，所有端点需 Bearer Token 认证
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>认证</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            {`Authorization: Bearer sk-13f-xxxxxxxx`}
          </pre>
          <p className="text-sm text-muted-foreground mt-2">
            在账户中心生成 API 密钥。Free 用户 10 req/min，Pro 60 req/min，API 300 req/min。
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {endpoints.map((ep) => (
          <Card key={ep.path}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{ep.method}</Badge>
                <code className="text-sm">{ep.path}</code>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{ep.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>示例请求</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            {`curl -H "Authorization: Bearer sk-13f-xxx" \\
  "https://your-domain.com/api/v1/institutions/0001067983/holdings?period=2025-Q3"`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
