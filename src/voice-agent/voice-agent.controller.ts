import { Body, Controller, Post } from "@nestjs/common";
import { VoiceRequestDto } from "./dto/voice-request.dto";
import { ActionExecutorService } from "./services/action-executor.service";
import { BrainService } from "./services/brain.service";
import { VoiceExecuteRequestDto } from "./dto/voice-execute-request.dto";
import { Customer, User } from "src/decorator/customize";

@Controller("voice")
export class VoiceController {
  constructor(
    private readonly executor: ActionExecutorService,
    private readonly brain: BrainService
  ) { }
  @Customer()
  @Post()
  async plan(@Body() dto: VoiceRequestDto, @User() user) {
    return this.brain.plan(dto);
  }
  @Customer()
  @Post("execute")
  async execute(@Body() dto: VoiceExecuteRequestDto, @User() user) {
    return this.executor.executeBatch(
      dto.beActions,
      dto.feActions,
      user._id
    );
  }
}