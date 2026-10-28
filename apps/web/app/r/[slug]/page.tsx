import { redirect } from 'next/navigation';

export default function RestaurantRoot({ params }: { params: { slug: string } }) {
  redirect(`/r/${params.slug}/login`);
}
