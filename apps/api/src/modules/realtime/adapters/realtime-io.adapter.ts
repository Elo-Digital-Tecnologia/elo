import type { INestApplicationContext } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';
import type { CorsPolicy } from '#/config/cors.js';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { corsOriginOf } from '#/config/cors.js';

/** Socket.IO adapter that applies the same CORS policy as the HTTP routes. */
export class RealtimeIoAdapter extends IoAdapter {
    constructor(
        app: INestApplicationContext,
        private readonly corsPolicy: CorsPolicy
    ) {
        super(app);
    }

    public override createIOServer(port: number, options?: ServerOptions): unknown {
        return super.createIOServer(port, {
            ...options,
            cors: {
                origin: corsOriginOf(this.corsPolicy),
                methods: this.corsPolicy.methods,
                credentials: true
            }
        });
    }
}
