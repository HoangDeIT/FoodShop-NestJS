import { Module } from '@nestjs/common';
import { VoiceController } from './voice-agent.controller';
import { ActionExecutorService } from './services/action-executor.service';
import { BrainService } from './services/brain.service';
import { DomainService } from './services/domain.service';
import { MemoryService } from './services/memory.service';
import { MongooseModule } from '@nestjs/mongoose';
import { VoiceConversation, VoiceConversationSchema } from './schemas/voice-conversation.schema';
import { Location, LocationSchema } from 'src/locations/schemas/location.schema';
import { VoiceMessage, VoiceMessageSchema } from './schemas/voice-message.schema';
import { UsersService } from 'src/users/users.service';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { UsersModule } from 'src/users/users.module';
import { LocationsModule } from 'src/locations/locations.module';
import { Review, ReviewSchema } from 'src/reviews/schemas/review.schema';
import { CustomerProfile, CustomerProfileSchema } from 'src/customer-profiles/schemas/customer-profile.schema';
import { SellerProfile, SellerProfileSchema } from 'src/seller-profiles/schemas/seller-profile.schema';



@Module({
  controllers: [VoiceController],
  providers: [ActionExecutorService, BrainService, DomainService, MemoryService, UsersService],
  imports: [MongooseModule.forFeature([
    { name: Location.name, schema: LocationSchema },
    { name: VoiceConversation.name, schema: VoiceConversationSchema },
    { name: VoiceMessage.name, schema: VoiceMessageSchema },
    { name: User.name, schema: UserSchema },
    { name: Review.name, schema: ReviewSchema },
    { name: CustomerProfile.name, schema: CustomerProfileSchema },
    { name: SellerProfile.name, schema: SellerProfileSchema }

  ]), LocationsModule, UsersModule],
})
export class VoiceAgentModule { }
