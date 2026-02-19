import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageQueryDto, ConversationQueryDto } from './dto/message-query.dto';
import { UploadUrlDto } from './dto/upload-url.dto';
import { JwtAuthGuard, RolesGuard } from '../../common';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ---------------------------------------------------------------------------
  // GET /chat/conversations
  // ---------------------------------------------------------------------------

  @Get('conversations')
  @ApiOperation({
    summary: 'List conversations',
    description:
      'Lists all chat conversations for the authenticated user with pagination. ' +
      'Includes the last message and unread count for each conversation.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of conversations' })
  async listConversations(
    @Request() req: any,
    @Query() query: ConversationQueryDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.chatService.listConversations(userId, query);
  }

  // ---------------------------------------------------------------------------
  // GET /chat/unread-count
  // (must be above :id routes to avoid param conflict)
  // ---------------------------------------------------------------------------

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get total unread message count',
    description:
      'Returns the total number of unread messages across all conversations ' +
      'for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Unread count returned' })
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.chatService.getUnreadCount(userId);
  }

  // ---------------------------------------------------------------------------
  // POST /chat/upload-url
  // ---------------------------------------------------------------------------

  @Post('upload-url')
  @ApiOperation({
    summary: 'Get a presigned upload URL',
    description:
      'Returns a presigned URL for uploading a file attachment. ' +
      'Currently returns a stub as S3 is not yet configured.',
  })
  @ApiResponse({ status: 201, description: 'Upload URL generated' })
  async getPresignedUploadUrl(@Body() dto: UploadUrlDto) {
    return this.chatService.getPresignedUploadUrl(dto);
  }

  // ---------------------------------------------------------------------------
  // GET /chat/conversations/:id
  // ---------------------------------------------------------------------------

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get conversation details',
    description:
      'Returns details of a specific conversation. ' +
      'The authenticated user must be a participant.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.chatService.getConversation(id, userId);
  }

  // ---------------------------------------------------------------------------
  // GET /chat/conversations/:id/messages
  // ---------------------------------------------------------------------------

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Get conversation messages',
    description:
      'Returns messages for a conversation with cursor-based pagination. ' +
      'Messages are returned in reverse chronological order (newest first). ' +
      'Pass a cursor (message UUID) to load older messages.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of messages' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Query() query: MessageQueryDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.chatService.getMessages(id, userId, query);
  }

  // ---------------------------------------------------------------------------
  // POST /chat/conversations/:id/messages
  // ---------------------------------------------------------------------------

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Send a message (REST fallback)',
    description:
      'Sends a message to a conversation via REST API. ' +
      'For real-time messaging, use the WebSocket gateway instead. ' +
      'Message content is encrypted at rest using AES-256-GCM.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 403, description: 'Not a participant or conversation closed' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: CreateMessageDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.chatService.sendMessage(id, userId, dto);
  }

  // ---------------------------------------------------------------------------
  // PATCH /chat/conversations/:id/read
  // ---------------------------------------------------------------------------

  @Patch('conversations/:id/read')
  @ApiOperation({
    summary: 'Mark messages as read',
    description:
      'Marks all unread messages from the other party in this conversation as read.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.chatService.markAsRead(id, userId);
  }
}
