import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './modules/ai/ai.module';
import { AttentionModule } from './modules/attention/attention.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { CattleModule } from './modules/cattle/cattle.module';
import { DatabaseModule } from './modules/database/database.module';
import { FarmModule } from './modules/farm/farm.module';
import { FinancialModule } from './modules/financial/financial.module';
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    ChatModule,
    CattleModule,
    FarmModule,
    FinancialModule,
    ProfileModule,
    AiModule,
    AttentionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
