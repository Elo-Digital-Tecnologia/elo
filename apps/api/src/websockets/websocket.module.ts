// WebSocket Module — Elo Digital API

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WebsocketGateway } from './gateway';

@Module({
  imports: [
    JwtModule.register({
      global: true
    })
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway]
})
export class WebsocketModule {}