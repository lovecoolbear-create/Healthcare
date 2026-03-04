// ⚡️ 静态导出适配：动态路由必须在 Server Component 中声明 generateStaticParams
import PlanClient from './PlanClient';

export function generateStaticParams() {
  return [{ id: 'default' }];
}

export default function ClientPlanPage() {
  return <PlanClient />;
}
