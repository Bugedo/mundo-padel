import SocialAdminPanel from './social-admin-panel';

export default async function SocialEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SocialAdminPanel eventId={id} />;
}
