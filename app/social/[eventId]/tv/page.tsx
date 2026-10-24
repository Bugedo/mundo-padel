import SocialTv from './social-tv';

export default async function SocialTvPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <SocialTv eventId={eventId} />;
}
