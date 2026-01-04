import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePacingEngineDto } from './create-pacing-engine.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { PacingStatus } from '../../../entities/dialer/pacing-engine.entity';

export class UpdatePacingEngineDto extends PartialType(CreatePacingEngineDto) {
  @ApiPropertyOptional({
    description: 'Pacing engine status',
    enum: PacingStatus,
    example: PacingStatus.RUNNING,
  })
  @IsOptional()
  @IsEnum(PacingStatus)
  status?: PacingStatus;
}
