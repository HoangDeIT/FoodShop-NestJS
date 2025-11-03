import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { LikesService } from './likes.service';
import { Auth, Customer, User } from 'src/decorator/customize';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) { }
  @Customer()
  @Get(':shopId/like/status')
  async checkLikeStatus(@Param('shopId') shopId: string, @User() user) {
    const isLiked = await this.likesService.isLiked(user._id, shopId);
    return { shopId, userId: user._id, isLiked };
  }
  @Customer()
  @Post(':shopId/like')
  async likeShop(@Param('shopId') shopId: string, @User() user) {
    const userId = user._id; // lấy user từ JWT
    return this.likesService.likeShop(userId, shopId);
  }
  @Customer()
  @Get('user')
  async findAllLikesByUser(
    @User() user,
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
    @Query() query?: Record<string, any>,
  ) {
    const qs = new URLSearchParams(query as any).toString();
    return this.likesService.findAllLikesByUser(
      user._id,
      Number(current) || 1,
      Number(pageSize) || 10,
      qs,
    );
  }

  @Customer()
  @Delete(':shopId/like')

  async unlikeShop(@Param('shopId') shopId: string, @User() user) {
    return this.likesService.unlikeShop(user._id, shopId);
  }

  @Get(':shopId/likes')

  async getLikes(@Param('shopId') shopId: string) {
    return this.likesService.getLikesByShop(shopId);
  }

  @Auth()
  @Get(':shopId/likes/count')
  async countLikes(@Param('shopId') shopId: string) {
    const totalLikes = await this.likesService.countLikes(shopId);
    return { shopId, totalLikes };
  }

  @Customer()
  @Get('liked/shops')

  async getLikedShops(@User() user) {
    return this.likesService.getLikedShopsByUser(user._id);
  }

}
