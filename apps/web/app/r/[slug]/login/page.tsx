'use client';

import type { PublicMenuView } from '@elo/core/api/views/restaurant.view';
import type { FieldError } from '@elo/core/fields/field-rules';
import { api } from '@elo/client/http/api-client';
import { ApiError } from '@elo/client/http/api-error';
import { HTTP_STATUS } from '@elo/client/http/http-status';
import { useAuth } from '@elo/client/session/auth';
import { CREDENTIAL_INPUT_LIMITS } from '@elo/core/fields/field-rules';
import { Button } from '@elo/ui/components/forms/button';
import { Input, PasswordInput } from '@elo/ui/components/forms/fields';
import { AuthLayout } from '@elo/ui/components/layout/auth-layout';
import { Field } from '@elo/ui/components/layout/section';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { unexpected, useForm } from '../../../_lib/use-form';
import { homeOf } from '../_components/shell';

/** Sign-in only asks for both fields: checking the account rules here would reveal them. */
const filled = (v: string): FieldError | null => (v.trim() ? null : { code: 'required' });

export default function Login() {
    const { slug } = useParams<{ slug: string }>();
    const router = useRouter();
    const { user, ready, setToken } = useAuth(slug);
    const [name, setName] = useState<string | null>(null);
    const [missing, setMissing] = useState(false);
    const form = useForm(
        { username: '', password: '' },
        { username: filled, password: filled }
    );
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api<PublicMenuView>(`/api/public/${slug}/menu`)
            .then((r) => setName(r.restaurant.name))
            .catch(
                (e) =>
                    e instanceof ApiError &&
                    e.status === HTTP_STATUS.NOT_FOUND &&
                    setMissing(true)
            );
    }, [slug]);

    useEffect(() => {
        if (ready && user) router.replace(homeOf(slug, user.roles));
    }, [ready, user, slug, router]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!form.validate()) return;
        setLoading(true);
        try {
            const res = await api<{ accessToken: string }>(
                `/api/auth/restaurants/${slug}/login`,
                { body: form.values }
            );
            setToken(res.accessToken);
        } catch (err) {
            setError(
                err instanceof ApiError && err.status === HTTP_STATUS.UNAUTHORIZED
                    ? 'Usuário ou senha incorretos.'
                    : unexpected(err)
            );
        } finally {
            setLoading(false);
        }
    };

    if (missing)
        return (
            <AuthLayout brandSub="Equipe">
                <p className="text-sm text-muted">
                    Este endereço não pertence a nenhum restaurante. Confira o link com o
                    titular do restaurante.
                </p>
            </AuthLayout>
        );

    return (
        <AuthLayout brandSub="Equipe" title={name ?? undefined}>
            <form onSubmit={submit} noValidate className="space-y-4">
                <Field label="Usuário" error={form.errors.username}>
                    <Input
                        {...form.bind('username')}
                        maxLength={64}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoFocus
                    />
                </Field>
                <Field label="Senha" error={form.errors.password}>
                    <PasswordInput
                        {...form.bind('password')}
                        maxLength={CREDENTIAL_INPUT_LIMITS.password}
                        autoComplete="current-password"
                    />
                </Field>
                {error && (
                    <p role="alert" className="text-sm text-danger">
                        {error}
                    </p>
                )}
                <Button className="w-full !py-3.5" type="submit" loading={loading}>
                    Entrar
                </Button>
            </form>
        </AuthLayout>
    );
}
