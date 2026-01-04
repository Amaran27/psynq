import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class ConnectSalesforceDto {
  @ApiProperty({ description: 'OAuth authorization code from Salesforce' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'OAuth redirect URI (must match configured)' })
  @IsUrl()
  @IsNotEmpty()
  redirectUri: string;

  @ApiPropertyOptional({ description: 'OAuth state parameter' })
  @IsString()
  state?: string;
}
