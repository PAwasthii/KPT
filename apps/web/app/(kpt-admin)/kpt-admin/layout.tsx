import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminLayoutClient from '@/components/kpt/AdminLayoutClient';

export default async function KptAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token');

  if (!token?.value) {
    redirect('/login');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
