'use client';

import { PageHeader } from '@elo/ui';
import { ActivityList } from '../../../../_components/activity-list';
import { Shell, useStaff } from '../../_components/shell';

function Activity() {
  const { token } = useStaff();
  return (
    <>
      <PageHeader title="Registros" description="O que a equipe e a Elo Digital fizeram no restaurante." />
      <ActivityList endpoint="/api/restaurant/activity" token={token} />
    </>
  );
}

export default function ActivityPage() {
  return (
    <Shell roles={['restaurant_admin']}>
      <Activity />
    </Shell>
  );
}
