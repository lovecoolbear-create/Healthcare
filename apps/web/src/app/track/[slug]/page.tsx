import TrackClient from './TrackClient';

export function generateStaticParams() {
  return [
    { slug: 'user-7d2f-4b9e-91a2' },
    { slug: 'test-slug' },
    { slug: 'sync-test-v1' }
  ];
}

export default function TrackSlugPage({ params }: { params: { slug: string } }) {
  return <TrackClient slug={params.slug} />;
}
