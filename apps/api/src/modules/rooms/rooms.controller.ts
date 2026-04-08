import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import {
  CreateRoomDto,
  RoomResponseDto,
  AddUserToRoomDto,
} from '@chat-app/shared/dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../../types/request-with-user';

@ApiTags('Rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat room' })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
    type: RoomResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'At least one userId or userEmail must be provided',
  })
  @ApiResponse({ status: 404, description: 'User not found', })
  async createRoom(
    @Body() dto: CreateRoomDto,
    @Request() req: RequestWithUser,
  ): Promise<RoomResponseDto> {
    return this.roomsService.createRoom(dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rooms for current user' })
  @ApiQuery({
    name: 'online',
    required: false,
    description: 'Filter by online users (true/false or 1/0)',
  })
  @ApiResponse({
    status: 200,
    description: 'Rooms retrieved successfully',
    type: [RoomResponseDto],
  })
  async getUserRooms(
    @Request() req: RequestWithUser,
    @Query('online') online?: string,
  ): Promise<RoomResponseDto[]> {
    return this.roomsService.getUserRooms(
      req.user.userId,
      this.parseOnlineFilter(online),
    );
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'Room retrieved successfully',
    type: RoomResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this room' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomById(
    @Param('roomId') roomId: string,
    @Request() req: RequestWithUser,
  ): Promise<RoomResponseDto> {
    return this.roomsService.getRoomById(roomId, req.user.userId);
  }

  @Post(':roomId/users')
  @ApiOperation({ summary: 'Add user to room' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'User added successfully',
    type: RoomResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this room' })
  @ApiResponse({ status: 404, description: 'User or room not found' })
  async addUserToRoom(
    @Param('roomId') roomId: string,
    @Body() dto: AddUserToRoomDto,
    @Request() req: RequestWithUser,
  ): Promise<RoomResponseDto> {
    return this.roomsService.addUserToRoom(roomId, dto, req.user.userId);
  }

  @Delete(':roomId/leave')
  @ApiOperation({ summary: 'Leave room' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Left room successfully' })
  @ApiResponse({ status: 403, description: 'Not a member of this room' })
  async leaveRoom(
    @Param('roomId') roomId: string,
    @Request() req: RequestWithUser,
  ): Promise<{ left: boolean }> {
    return this.roomsService.leaveRoom(roomId, req.user.userId);
  }

  private parseOnlineFilter(value?: string): boolean | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === 'true' || value === '1') {
      return true;
    }

    if (value === 'false' || value === '0') {
      return false;
    }

    return undefined;
  }
}
