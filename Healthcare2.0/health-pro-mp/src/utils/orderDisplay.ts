/**
 * 各端统一展示的订单号：
 * - 新订单：使用云端写入的 order_no（如 HP20260514A1B2C3）
 * - 历史订单：无 order_no 时用 _id 后 8 位（与此前 Web 管理端习惯一致）
 */
export function formatOrderDisplayNo(order: { order_no?: string; _id?: string } | null | undefined): string {
  if (!order) return '—';
  const no = order.order_no != null && String(order.order_no).trim();
  if (no) return String(order.order_no).trim();
  if (order._id) return order._id.slice(-8).toUpperCase();
  return '—';
}
