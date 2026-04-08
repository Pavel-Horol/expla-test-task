import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ArrayMinSize, IsOptional, IsEmail } from 'class-validator';
import {
  CreateRoomRequest,
  AddUserToRoomRequest,
  RoomResponse,
  MessageResponse,
} from '@chat-app/shared/api-types';
import { MessageResponseDto } from './message.dto';

export class CreateRoomDto implements CreateRoomRequest {
  @ApiProperty({ example: 'General Chat' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: ['user-id-1', 'user-id-2'],
    description: 'Initial user IDs for the room',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];

  @ApiPropertyOptional({
    example: ['user1@example.com', 'user2@example.com'],
    description: 'Initial user emails for the room',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  @IsOptional()
  userEmails?: string[];
}

export class AddUserToRoomDto implements AddUserToRoomRequest {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class RoomResponseDto implements RoomResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  userIds!: string[];

  @ApiProperty({ required: false })
  onlineCount?: number;

  @ApiProperty({ required: false })
  hasOnline?: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ required: false, type: MessageResponseDto, nullable: true })
  lastMessage?: MessageResponse | null;
}
