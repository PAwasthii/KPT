import { redirect } from 'next/navigation';
export default function Page({ params }: { params: { crn: string } }) {
  redirect(`/partner-applications/field/${params.crn}`);
}
