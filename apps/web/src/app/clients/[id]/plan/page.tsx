// ⚡️ 路由统一：动态路由直接重定向至静态 Workspace 以保持单页状态
import { redirect } from 'next/navigation';

export function generateStaticParams() {
  return [
    { id: 'client-001' },
    { id: 'client-002' },
    { id: 'client-003' },
  ];
}

export default function ClientPlanPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  if (id) {
    redirect(`/clients/plan?id=${id}`);
  } else {
    redirect('/clients/plan');
  }
}
