import {
  Controller,
  Get,
  Delete,
  Put,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { BasicAuthGuard } from '../auth';
import { Order, OrderService } from '../order';
import { AppRequest, getUserIdFromRequest } from '../shared';
import { CartService } from './services';
import { CreateOrderDto, PutCartPayload } from '../order/type';
import { Cart, CartItem, CartStatus } from '../database/entities';

@Controller('api/profile/cart')
export class CartController {
  constructor(
    private cartService: CartService,
    private orderService: OrderService,
  ) {}

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Get()
  async findUserCart(@Req() req: AppRequest): Promise<CartItem[]> {
    // Workaround for Lambda esbuild DI issue
    if (!this.cartService) {
      throw new Error('CartService not available - DI issue in Lambda bundling');
    }

    const cart = await this.cartService.findOrCreateByUserId(
      getUserIdFromRequest(req),
    );

    return cart.items || [];
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Put()
  async updateUserCart(
    @Req() req: AppRequest,
    @Body() body: { products: Array<{ productId: string; count: number }> },
  ): Promise<CartItem[]> {
    // TODO: validate body payload...
    const cart = await this.cartService.updateCartWithProducts(
      getUserIdFromRequest(req),
      body.products || [],
    );

    return cart.items || [];
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearUserCart(@Req() req: AppRequest): Promise<void> {
    await this.cartService.removeByUserId(getUserIdFromRequest(req));
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Put('order')
  async checkout(
    @Req() req: AppRequest,
    @Body() body: CreateOrderDto,
  ): Promise<{ order: Order }> {
    const userId = getUserIdFromRequest(req);
    const cart = await this.cartService.findByUserId(userId);

    if (!(cart && cart.items && cart.items.length)) {
      throw new BadRequestException('Cart is empty');
    }

    const { id: cartId, items } = cart;

    // Calculate total from cart items
    const total = items.reduce((sum, item) => {
      // Since we don't have product price in CartItem entity,
      // we'll need to fetch it or store it
      // For now, using a placeholder
      return sum + item.count * 0; // TODO: Add product price
    }, 0);

    const order = this.orderService.create({
      userId,
      cartId,
      items: items.map((item) => ({
        productId: item.productId,
        count: item.count,
      })),
      address: body.address,
      total,
    });

    // Update cart status to ORDERED instead of removing
    await this.cartService.updateCartStatus(cartId, CartStatus.ORDERED);

    return {
      order,
    };
  }

  @UseGuards(BasicAuthGuard)
  @Get('order')
  getOrder(): Order[] {
    return this.orderService.getAll();
  }
}
