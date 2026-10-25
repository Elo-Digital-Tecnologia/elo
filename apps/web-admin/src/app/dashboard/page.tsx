'use client';

import { Card, CardHeader, CardTitle, CardContent, StatCardGrid, Heading, Text, Icon } from '@elo-digital/ui';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@elo-digital/core/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchStats() {
  const res = await fetch(`${API_URL}/api/admin/dashboard`, {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export default function DashboardPage() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchStats,
    retry: false
  });

  if (isLoading) {
    return (
      <main className="p-6">
        <StatCardGrid
          stats={[
            { title: 'Restaurantes', value: '...', variant: 'primary' },
            { title: 'Usuários', value: '...', variant: 'info' },
            { title: 'Assinaturas', value: '...', variant: 'success' },
            { title: 'Receita', value: '...', variant: 'warning' }
          ]}
          columns={4}
        />
      </main>
    );
  }

  if (isError || !stats) {
    return (
      <main className="p-6">
        <Heading level={1} size="displaySm">Dashboard Elo Digital</Heading>
        <Text color="muted" className="mt-2">
          Não foi possível carregar os dados. Verifique se a API está em execução e se você está autenticado.
        </Text>
      </main>
    );
  }

  const statsData = [
    {
      title: 'Restaurantes',
      value: stats.restaurants.total.toString(),
      change: { value: stats.restaurants.active, label: 'ativos', positive: true },
      icon: 'utensilsCrossed' as const,
      variant: 'primary' as const
    },
    {
      title: 'Usuários da Equipe',
      value: stats.users.total.toString(),
      icon: 'users' as const,
      variant: 'info' as const
    },
    {
      title: 'Assinaturas Ativas',
      value: stats.subscriptions.active.toString(),
      change: { value: stats.subscriptions.total - stats.subscriptions.active, label: 'total', positive: false },
      icon: 'creditCard' as const,
      variant: 'success' as const
    },
    {
      title: 'Receita Mensal',
      value: formatCurrency(stats.subscriptions.total * 29900),
      icon: 'trendingUp' as const,
      variant: 'warning' as const
    }
  ];

  return (
    <main className="p-6">
      <div className="mb-8">
        <Heading level={1} size="displaySm">Dashboard Elo Digital</Heading>
        <Text color="muted" className="mt-2">
          Visão geral da plataforma
        </Text>
      </div>

      <StatCardGrid stats={statsData} columns={4} gap="md" />

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card variant="glass" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="checkCircle" color="success" aria-hidden="true" />
              Restaurantes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--color-primary)]">
              {stats.restaurants.active}
            </div>
            <Text size="body-sm" color="muted" className="mt-1">
              de {stats.restaurants.total} cadastrados
            </Text>
          </CardContent>
        </Card>

        <Card variant="glass" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="alertCircle" color="destructive" aria-hidden="true" />
              Restaurantes Suspensos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--color-destructive)]">
              {stats.restaurants.suspended}
            </div>
            <Text size="body-sm" color="muted" className="mt-1">
              Precisam de atenção
            </Text>
          </CardContent>
        </Card>

        <Card variant="glass" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="users" color="primary" aria-hidden="true" />
              Usuários da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--color-foreground)]">
              {stats.users.total}
            </div>
            <Text size="body-sm" color="muted" className="mt-1">
              Administradores Elo Digital
            </Text>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
