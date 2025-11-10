import { Module } from '@nestjs/common';
import { OpenAiController } from './open-ai.controller';
import { ActionService } from './action.service';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { ResponseService } from './response.service';
import { BrainService } from './brain.service';
import { UsersModule } from 'src/users/users.module';
import { OrdersModule } from 'src/orders/orders.module';
import { LocationsModule } from 'src/locations/locations.module';

@Module({
  controllers: [OpenAiController],
  providers: [ActionService, AiOrchestratorService, ResponseService, BrainService],
  exports: [AiOrchestratorService],
  imports: [UsersModule, OrdersModule, LocationsModule],
})
export class OpenAiModule { }
