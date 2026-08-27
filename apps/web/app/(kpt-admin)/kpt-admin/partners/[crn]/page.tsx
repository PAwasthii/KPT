import { redirect } from 'next/navigation';
export default async function Page({ params }: { params: Promise<{ crn: string }> }) {
  const { crn } = await params;
  redirect(`/partner-applications/${crn}`);
}
