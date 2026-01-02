import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  username: string;
  roles: string[];
  orgId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET environment variable is missing');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload) {
    // The payload is the decrypted token.
    // We can do further validation here, e.g., check if user exists in DB.
    // For now, we'll trust the token is valid if it was signed with our secret.
    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles,
      organizationId: payload.orgId,
    };
  }
}
