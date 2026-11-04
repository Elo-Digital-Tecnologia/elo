import type { TestProject } from 'vitest/node';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

/** Same image as the local Docker setup and production. */
const POSTGRES_IMAGE = 'postgres:16-alpine';
/** Throwaway data: never flushed to disk. */
const NO_DURABILITY = [
    '-c',
    'fsync=off',
    '-c',
    'synchronous_commit=off',
    '-c',
    'full_page_writes=off'
];

declare module 'vitest' {
    export interface ProvidedContext {
        postgres: { host: string; port: number; user: string; password: string };
    }
}

/** One throwaway Postgres for the whole e2e run; each worker gets its own database in it. */
export default async function setup(project: TestProject) {
    const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
        .withCommand(['postgres', ...NO_DURABILITY])
        .start();
    project.provide('postgres', {
        host: container.getHost(),
        port: container.getPort(),
        user: container.getUsername(),
        password: container.getPassword()
    });
    return async () => {
        await container.stop();
    };
}
