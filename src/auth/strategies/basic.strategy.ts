import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { BasicStrategy as Strategy } from 'passport-http';

import { AuthService } from '../auth.service';

// Simple in-memory users for Lambda compatibility
const users = new Map<string, { id: string; name: string; password: string }>();

@Injectable()
export class BasicStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(username: string, pass: string): Promise<any> {
    // Try to use AuthService if available (for local development)
    if (
      this.authService &&
      typeof this.authService.validateUser === 'function'
    ) {
      const user = this.authService.validateUser(username, pass);
      if (user) {
        const { password, ...result } = user;
        return result;
      }
    }

    // Fallback to in-memory validation for Lambda
    let user = users.get(username);

    if (!user) {
      // Create user on first request (like original behavior)
      const id = `user-${Date.now()}`;
      user = { id, name: username, password: pass };
      users.set(username, user);
    }

    const { password, ...result } = user;
    return result;
  }
}
