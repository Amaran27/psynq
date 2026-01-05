import {
  IsArray,
  IsDateString,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ActualValueDto {
  @ApiProperty({ description: 'Timestamp (ISO 8601)' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Actual value' })
  @IsNumber()
  value: number;
}

export class UpdateActualsDto {
  @ApiProperty({ type: [ActualValueDto], description: 'Array of actual values' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActualValueDto)
  actuals: ActualValueDto[];
}
