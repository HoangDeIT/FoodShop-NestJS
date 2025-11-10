import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { Auth, Public, User } from 'src/decorator/customize';

@Controller('open-ai')
export class OpenAiController {
  constructor(private readonly aiOrchestratorService: AiOrchestratorService) { }
  @Auth()
  @Get()
  async hello(@Body() body: { message: string }, @User() user) {
    const reply = await this.aiOrchestratorService.handleUserMessage(body.message, user._id);
    return reply;
  }
  // @Public()
  // @Get('check')
  // async check(@Body() body: { message: string }) {
  //   const reply = await this.openaiService.checkContentSafety(body.message);
  //   return { message: reply };
  // }
}
