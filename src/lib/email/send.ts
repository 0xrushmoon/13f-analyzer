const RESEND_API = "https://api.resend.com/emails";

/** Resend sandbox — only delivers to the Resend account owner email. */
const RESEND_SANDBOX_FROM = /@resend\.dev$/i;

export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailSendError";
  }
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new EmailSendError(
      "邮件服务未配置（缺少 RESEND_API_KEY 或 EMAIL_FROM）"
    );
  }

  const fromAddress = from.match(/<([^>]+)>/)?.[1] ?? from;
  if (RESEND_SANDBOX_FROM.test(fromAddress)) {
    throw new EmailSendError(
      "EMAIL_FROM 使用了 Resend 测试域名（@resend.dev），只能发送到 Resend 账户邮箱。请改用已验证域名，例如 HoldingsKit <noreply@oktangle.com>"
    );
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend error:", res.status, body);
    let detail = body;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      detail = parsed.message ?? body;
    } catch {
      // keep raw body
    }
    throw new EmailSendError(`邮件发送失败：${detail}`);
  }
}
