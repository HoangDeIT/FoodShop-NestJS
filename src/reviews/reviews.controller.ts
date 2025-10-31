import { Body, Controller, Get, Param, Post, Delete } from '@nestjs/common';
import { ReviewService } from './reviews.service';
import { Auth, Public, User } from 'src/decorator/customize';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  @Auth()
  @Post()
  async createReview(@Body() body: CreateReviewDto, @User() user) {
    const userId = user._id;
    return this.reviewService.createReview(userId, body);
  }

  @Auth()
  @Post(':id/reply')
  async addReply(
    @Param('id') reviewId: string,
    @Body('comment') comment: string,
    @User() user) {
    const userId = user._id;
    return this.reviewService.addReply(reviewId, userId, comment);
  }
  @Public()
  // 🔵 GET /reviews/product/:productId
  @Get('product/:productId')
  async getByProduct(@Param('productId') productId: string) {
    return this.reviewService.getReviewsByProduct(productId);
  }
  @Auth()
  @Delete(':reviewId/replies/:replyId')
  async deleteReply(
    @Param('reviewId') reviewId: string,
    @Param('replyId') replyId: string,
    @User() user
  ) {
    return this.reviewService.softDeleteReply(reviewId, replyId, user._id);
  }
  @Auth()
  @Delete(':id')
  async deleteReview(@Param('id') id: string, @User() user) {
    const userId = user._id;
    return this.reviewService.softDeleteReview(id, userId);
  }

  @Auth() // chỉ user login
  @Get('check/:productId')
  async checkCanReview(@Param('productId') productId: string, @User() req) {
    const userId = req._id;
    return this.reviewService.checkCanReview(userId, productId);
  }
}
