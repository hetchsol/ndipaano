import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageQueryDto, ConversationQueryDto } from './dto/message-query.dto';
import { UploadUrlDto } from './dto/upload-url.dto';
import { MessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const keyString =
      this.configService.get<string>('encryption.key') ||
      'CHANGE_ME_32_BYTE_KEY_IN_PROD!!';

    // Ensure the key is exactly 32 bytes for AES-256
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(keyString)
      .digest();
  }

  // ---------------------------------------------------------------------------
  // Encryption: AES-256-GCM
  // ---------------------------------------------------------------------------

  encryptContent(text: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all hex-encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decryptContent(encrypted: string): string {
    try {
      const parts = encrypted.split(':');

      if (parts.length !== 3) {
        // Field may not be encrypted (legacy data), return as-is
        return encrypted;
      }

      const [ivHex, authTagHex, ciphertext] = parts;

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      return '[Decryption failed]';
    }
  }

  // ---------------------------------------------------------------------------
  // Create Conversation
  // ---------------------------------------------------------------------------

  async createConversation(
    bookingId: string,
    patientId: string,
    practitionerId: string,
  ) {
    // If a conversation already exists for this booking, return it
    const existing = await this.prisma.conversation.findUnique({
      where: { bookingId },
    });

    if (existing) {
      return existing;
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        bookingId,
        patientId,
        practitionerId,
      },
    });

    this.logger.log(
      `Conversation ${conversation.id} created for booking ${bookingId}`,
    );

    return conversation;
  }

  // ---------------------------------------------------------------------------
  // List Conversations
  // ---------------------------------------------------------------------------

  async listConversations(userId: string, query: ConversationQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ patientId: userId }, { practitionerId: userId }],
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true },
          },
          practitioner: {
            select: { id: true, firstName: true, lastName: true },
          },
          booking: {
            select: { id: true, serviceType: true, status: true, scheduledAt: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              type: true,
              content: true,
              isEncrypted: true,
              senderId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    // Enrich each conversation with unread count and other party info
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        // Count unread messages (messages not sent by this user and not yet read)
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            readAt: null,
          },
        });

        // Determine the other party
        const otherParty =
          conv.patientId === userId ? conv.practitioner : conv.patient;

        // Decrypt the last message content if present and encrypted
        const lastMessage = conv.messages[0] || null;
        let decryptedLastMessage = lastMessage;
        if (lastMessage && lastMessage.isEncrypted) {
          decryptedLastMessage = {
            ...lastMessage,
            content: this.decryptContent(lastMessage.content),
          };
        }

        return {
          id: conv.id,
          bookingId: conv.bookingId,
          booking: conv.booking,
          isActive: conv.isActive,
          closedAt: conv.closedAt,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          otherParty,
          lastMessage: decryptedLastMessage,
          unreadCount,
        };
      }),
    );

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Get Single Conversation
  // ---------------------------------------------------------------------------

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
        booking: {
          select: { id: true, serviceType: true, status: true, scheduledAt: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify the user is a participant
    if (
      conversation.patientId !== userId &&
      conversation.practitionerId !== userId
    ) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const otherParty =
      conversation.patientId === userId
        ? conversation.practitioner
        : conversation.patient;

    return {
      ...conversation,
      otherParty,
    };
  }

  // ---------------------------------------------------------------------------
  // Get Messages (Cursor-Based Pagination)
  // ---------------------------------------------------------------------------

  async getMessages(
    conversationId: string,
    userId: string,
    query: MessageQueryDto,
  ) {
    const { cursor, limit = 50 } = query;

    // Verify conversation exists and user is participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, patientId: true, practitionerId: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.patientId !== userId &&
      conversation.practitionerId !== userId
    ) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Build the where clause for cursor-based pagination
    const where: any = { conversationId };

    if (cursor) {
      // Get the cursor message to find its createdAt timestamp
      const cursorMessage = await this.prisma.message.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });

      if (cursorMessage) {
        where.createdAt = { lt: cursorMessage.createdAt };
      }
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Decrypt message content before returning
    const decryptedMessages = messages.map((msg) => ({
      ...msg,
      content: msg.isEncrypted
        ? this.decryptContent(msg.content)
        : msg.content,
    }));

    return {
      data: decryptedMessages,
      meta: {
        hasMore: messages.length === limit,
        nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Send Message
  // ---------------------------------------------------------------------------

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: CreateMessageDto,
  ) {
    // Verify conversation exists, is active, and sender is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, patientId: true, practitionerId: true, isActive: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.patientId !== senderId &&
      conversation.practitionerId !== senderId
    ) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    if (!conversation.isActive) {
      throw new ForbiddenException('This conversation has been closed');
    }

    // Encrypt the message content
    const encryptedContent = this.encryptContent(dto.content);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        type: dto.type || MessageType.TEXT,
        content: encryptedContent,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        isEncrypted: true,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update conversation's updatedAt timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    this.logger.log(
      `Message ${message.id} sent in conversation ${conversationId} by user ${senderId}`,
    );

    // Return with decrypted content for immediate use
    return {
      ...message,
      content: dto.content,
    };
  }

  // ---------------------------------------------------------------------------
  // Mark Messages as Read
  // ---------------------------------------------------------------------------

  async markAsRead(conversationId: string, userId: string) {
    // Verify conversation exists and user is participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, patientId: true, practitionerId: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.patientId !== userId &&
      conversation.practitionerId !== userId
    ) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Mark all messages from the other party as read
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return {
      message: `${result.count} message(s) marked as read`,
      count: result.count,
    };
  }

  // ---------------------------------------------------------------------------
  // Get Unread Count
  // ---------------------------------------------------------------------------

  async getUnreadCount(userId: string) {
    // Count total unread messages across all conversations where user is participant
    const count = await this.prisma.message.count({
      where: {
        conversation: {
          OR: [{ patientId: userId }, { practitionerId: userId }],
        },
        senderId: { not: userId },
        readAt: null,
      },
    });

    return { unreadCount: count };
  }

  // ---------------------------------------------------------------------------
  // Send System Message
  // ---------------------------------------------------------------------------

  async sendSystemMessage(conversationId: string, content: string) {
    // Get the conversation to determine the practitioner (used as sender for system messages)
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, practitionerId: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: conversation.practitionerId,
        type: MessageType.SYSTEM,
        content,
        isEncrypted: false,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update conversation's updatedAt timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    this.logger.log(
      `System message ${message.id} sent in conversation ${conversationId}`,
    );

    return message;
  }

  // ---------------------------------------------------------------------------
  // Get Presigned Upload URL (Stub)
  // ---------------------------------------------------------------------------

  async getPresignedUploadUrl(dto: UploadUrlDto) {
    // Stub implementation - S3 not yet configured
    const key = `chat/${Date.now()}-${dto.fileName}`;

    this.logger.log(
      `Upload URL requested for file: ${dto.fileName} (${dto.mimeType}, ${dto.fileSize} bytes)`,
    );

    return {
      uploadUrl: '',
      key,
    };
  }
}
