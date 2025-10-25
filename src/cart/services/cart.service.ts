import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartItem, CartStatus } from '../../database/entities';
import { PutCartPayload } from '../../order/type';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
  ) {}

  async findByUserId(userId: string): Promise<Cart | null> {
    return this.cartRepository.findOne({
      where: { userId, status: CartStatus.OPEN },
      relations: ['items'],
    });
  }

  async createByUserId(userId: string): Promise<Cart> {
    const cart = this.cartRepository.create({
      userId,
      status: CartStatus.OPEN,
      items: [],
    });

    return this.cartRepository.save(cart);
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(userId: string, payload: PutCartPayload): Promise<Cart> {
    const userCart = await this.findOrCreateByUserId(userId);

    // Find existing cart item with this product
    const existingItem = userCart.items?.find(
      (item) => item.productId === payload.product.id,
    );

    if (existingItem) {
      if (payload.count === 0) {
        // Remove item if count is 0
        await this.cartItemRepository.remove(existingItem);
        userCart.items = userCart.items.filter(
          (item) => item.id !== existingItem.id,
        );
      } else {
        // Update count
        existingItem.count = payload.count;
        await this.cartItemRepository.save(existingItem);
      }
    } else if (payload.count > 0) {
      // Add new item
      const newItem = this.cartItemRepository.create({
        cartId: userCart.id,
        productId: payload.product.id,
        count: payload.count,
      });
      const savedItem = await this.cartItemRepository.save(newItem);
      if (!userCart.items) {
        userCart.items = [];
      }
      userCart.items.push(savedItem);
    }

    // Update cart's updated_at timestamp
    userCart.updatedAt = new Date();
    await this.cartRepository.save(userCart);

    // Return cart with updated items
    return this.cartRepository.findOne({
      where: { id: userCart.id },
      relations: ['items'],
    });
  }

  async removeByUserId(userId: string): Promise<void> {
    const userCart = await this.findByUserId(userId);
    if (userCart) {
      // Delete cart items first (cascade should handle this, but being explicit)
      if (userCart.items && userCart.items.length > 0) {
        await this.cartItemRepository.remove(userCart.items);
      }
      // Delete cart
      await this.cartRepository.remove(userCart);
    }
  }

  async updateCartStatus(cartId: string, status: CartStatus): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ['items'],
    });

    if (!cart) {
      throw new Error(`Cart with id ${cartId} not found`);
    }

    cart.status = status;
    return this.cartRepository.save(cart);
  }
}
