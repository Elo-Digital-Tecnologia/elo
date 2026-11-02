'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@elo/client';

/**
 * A panel opened from the restaurant's old link (bookmarks, installed shortcuts) moves
 * to the current one; the session follows, since the API renews it under the new link.
 */
export function CurrentLink() {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    api<{ slug: string }>(`/api/public/${slug}/link`)
      .then((r) => {
        if (r.slug !== slug) router.replace(`/r/${r.slug}${pathname.slice(`/r/${slug}`.length)}${window.location.search}`);
      })
      .catch(() => undefined);
  }, [slug]);
  return null;
}
