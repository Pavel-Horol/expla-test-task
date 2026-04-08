import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateMessageRequest,
  MessageResponse,
  GetMessagesQuery,
  MessagesPaginatedResponse,
} from '@chat-app/shared/api-types';

export class CreateMessageDto implements CreateMessageRequest {
  @ApiProperty({ example: 'Hello, world!' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ example: 'room-uuid-here' })
  @IsString()
  @IsNotEmpty()
  roomId!: string;
}

export class MessageResponseDto implements MessageResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  roomId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class GetMessagesQueryDto implements GetMessagesQuery {
  @ApiProperty({ required: false, default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiProperty({ required: false, description: 'Cursor (message ID) to paginate from' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({ required: false, enum: ['next', 'prev'], default: 'next', description: 'next = older messages, prev = newer messages' })
  @IsOptional()
  @IsEnum(['next', 'prev'])
  follow?: 'next' | 'prev' = 'next';
}

export class MessagesPaginatedResponseDto implements MessagesPaginatedResponse {
  @ApiProperty({ type: [MessageResponseDto] })
  data!: MessageResponseDto[];

  @ApiProperty({ nullable: true, description: 'Cursor for the next page (null if no more)' })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;
}
