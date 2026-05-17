import { redirect } from "next/navigation";

export default async function SequenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/outreach/campaigns/${id}`);
}
