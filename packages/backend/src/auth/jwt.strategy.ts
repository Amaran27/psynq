import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecretKey',
    });
  }

  async validate(payload: any) {
    // The payload is the decrypted token.
    // We can do further validation here, e.g., check if user exists in DB.
    // For now, we'll trust the token is valid if it was signed with our secret.
    return { 
      userId: payload.sub, 
      username: payload.username, 
      roles: payload.roles,
      organizationId: payload.orgId 
    };
  }
}
