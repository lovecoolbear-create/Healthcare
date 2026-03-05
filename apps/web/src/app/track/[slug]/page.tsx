import TrackClient from './TrackClient';

export function generateStaticParams() {
  return [
    { slug: 'client-1' },
    { slug: 'client-2' },
    { slug: 'client-3' },
  ];
}

export default function TrackPage({ params }: { params: { slug: string } }) {
  return <TrackClient slug={params.slug} />;
}
