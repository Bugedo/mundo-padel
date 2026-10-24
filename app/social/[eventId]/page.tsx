import PlayerSocialView from './player-social-view';

export default async function PlayerSocialPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <PlayerSocialView eventId={eventId} />;
}
