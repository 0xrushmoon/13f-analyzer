export function verifyAdminSecret(request: Request): boolean {
  const adminSecret = request.headers.get("X-Admin-Secret");
  return Boolean(adminSecret && adminSecret === process.env.ADMIN_SECRET);
}
