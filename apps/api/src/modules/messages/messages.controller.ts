import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { MessageResponseDto, MessagesPaginatedResponseDto, GetMessagesQueryDto } from '@chat-app/shared/dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../../types/request-with-user';

@ApiTags('Messages')
@Controller('rooms/:roomId/messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get messages from a room with cursor pagination' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: MessagesPaginatedResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this room' })
  async getMessages(
    @Param('roomId') roomId: string,
    @Query() query: GetMessagesQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<MessagesPaginatedResponseDto> {
    return this.messagesService.getMessages(roomId, req.user.userId, query);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest N messages from a room' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'Latest messages retrieved successfully',
    type: [MessageResponseDto],
  })
  async getLatestMessages(
    @Param('roomId') roomId: string,
    @Request() req: RequestWithUser,
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.getLatestMessages(roomId, req.user.userId, 50);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete your own message' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Can only delete your own messages' })
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Request() req: RequestWithUser,
  ): Promise<{ deleted: boolean }> {
    return this.messagesService.deleteMessage(messageId, req.user.userId);
  }
}
