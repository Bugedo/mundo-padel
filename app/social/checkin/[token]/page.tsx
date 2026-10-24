import CheckinClient from './checkin-client';

export default async function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CheckinClient token={token} />;
}
