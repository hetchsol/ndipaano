import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateProfileDto,
  UpdatePatientProfileDto,
  AddFamilyMemberDto,
  CreateDataSubjectRequestDto,
  SearchPatientsDto,
} from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search patients by name or UUID. Practitioners use this to find patients
   * when creating lab orders or other clinical workflows.
   */
  async searchPatients(dto: SearchPatientsDto) {
    const { search, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = search && uuidRegex.test(search.trim());

    const where: any = {
      role: 'PATIENT',
      isActive: true,
    };

    if (search && search.trim()) {
      if (isUUID) {
        where.id = search.trim();
      } else {
        where.OR = [
          { firstName: { contains: search.trim(), mode: 'insensitive' } },
          { lastName: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }
    }

    const [patients, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
        skip,
        take: limit,
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: patients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a user by ID, including patient and practitioner profiles.
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        patientProfile: true,
        practitionerProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, twoFactorSecret, ...result } = user;
    return result;
  }

  /**
   * Find a user by email address.
   */
  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        patientProfile: true,
        practitionerProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, twoFactorSecret, ...result } = user;
    return result;
  }

  /**
   * Update a user's basic profile information.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If phone is being updated, check for uniqueness
    if (dto.phone && dto.phone !== user.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new BadRequestException('Phone number is already in use');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.languagePreference !== undefined && {
          languagePreference: dto.languagePreference,
        }),
      },
      include: {
        patientProfile: true,
        practitionerProfile: true,
      },
    });

    const { passwordHash, twoFactorSecret, ...result } = updated;
    return result;
  }

  /**
   * Get a patient's profile including family members.
   */
  async getPatientProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: {
          include: {
            familyMembers: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.patientProfile) {
      throw new NotFoundException('Patient profile not found for this user');
    }

    return user.patientProfile;
  }

  /**
   * Update patient-specific profile data. Creates the patient profile if it
   * does not already exist.
   */
  async updatePatientProfile(userId: string, dto: UpdatePatientProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { patientProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: any = {};
    if (dto.dateOfBirth !== undefined)
      data.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.bloodType !== undefined) data.bloodType = dto.bloodType;
    if (dto.allergiesJson !== undefined) data.allergiesJson = dto.allergiesJson;
    if (dto.emergencyContactName !== undefined)
      data.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactPhone !== undefined)
      data.emergencyContactPhone = dto.emergencyContactPhone;
    if (dto.nhimaNumber !== undefined) data.nhimaNumber = dto.nhimaNumber;
    if (dto.insuranceProvider !== undefined)
      data.insuranceProvider = dto.insuranceProvider;
    if (dto.insurancePolicyNumber !== undefined)
      data.insurancePolicyNumber = dto.insurancePolicyNumber;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.province !== undefined) data.province = dto.province;

    if (user.patientProfile) {
      return this.prisma.patientProfile.update({
        where: { userId },
        data,
        include: { familyMembers: true },
      });
    }

    // Create a new patient profile if none exists
    return this.prisma.patientProfile.create({
      data: {
        userId,
        ...data,
      },
      include: { familyMembers: true },
    });
  }

  /**
   * Add a family member to the patient's profile.
   */
  async addFamilyMember(userId: string, dto: AddFamilyMemberDto) {
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!patientProfile) {
      throw new NotFoundException(
        'Patient profile not found. Please create a patient profile first.',
      );
    }

    return this.prisma.familyMember.create({
      data: {
        patientId: patientProfile.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        relationship: dto.relationship,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        consentGiven: dto.consentGiven,
      },
    });
  }

  /**
   * Remove a family member. Verifies that the family member belongs to the
   * requesting user's patient profile.
   */
  async removeFamilyMember(userId: string, memberId: string) {
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    const familyMember = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (!familyMember) {
      throw new NotFoundException('Family member not found');
    }

    if (familyMember.patientId !== patientProfile.id) {
      throw new ForbiddenException(
        'You do not have permission to remove this family member',
      );
    }

    await this.prisma.familyMember.delete({
      where: { id: memberId },
    });

    return { message: 'Family member removed successfully' };
  }

  /**
   * Soft-deactivate a user account by setting isActive to false.
   */
  async deactivateAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('Account is already deactivated');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return { message: 'Account deactivated successfully' };
  }

  /**
   * Create a GDPR/DPA data subject request (access, rectification, erasure,
   * portability).
   */
  async createDataSubjectRequest(
    userId: string,
    dto: CreateDataSubjectRequestDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for duplicate pending requests of the same type
    const existingPending = await this.prisma.dataSubjectRequest.findFirst({
      where: {
        userId,
        requestType: dto.requestType,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        `You already have a pending ${dto.requestType} request. Please wait for it to be processed.`,
      );
    }

    return this.prisma.dataSubjectRequest.create({
      data: {
        userId,
        requestType: dto.requestType,
        description: dto.description,
      },
    });
  }

  /**
   * List all data subject requests for a given user.
   */
  async getDataSubjectRequests(userId: string) {
    return this.prisma.dataSubjectRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Compile all user data for a data portability request. Returns a JSON
   * object containing the user's profile, patient profile, bookings, medical
   * records, prescriptions, payments, reviews, consent records, and
   * notifications.
   */
  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: {
          include: {
            familyMembers: true,
          },
        },
        practitionerProfile: {
          include: {
            documents: true,
          },
        },
        consentRecords: true,
        emergencyContacts: true,
        notifications: true,
        dataSubjectRequests: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch bookings where the user is a patient
    const patientBookings = await this.prisma.booking.findMany({
      where: { patientId: userId },
      include: {
        payment: true,
        review: true,
      },
    });

    // Fetch medical records where the user is a patient
    const medicalRecords = await this.prisma.medicalRecord.findMany({
      where: { patientId: userId },
      include: {
        prescriptions: true,
      },
    });

    // Fetch insurance claims
    const insuranceClaims = await this.prisma.insuranceClaim.findMany({
      where: { patientId: userId },
    });

    // Fetch reviews written by the user
    const reviewsWritten = await this.prisma.review.findMany({
      where: { patientId: userId },
    });

    // Strip sensitive fields
    const { passwordHash, twoFactorSecret, ...safeUser } = user;

    return {
      exportedAt: new Date().toISOString(),
      user: safeUser,
      bookings: patientBookings,
      medicalRecords,
      insuranceClaims,
      reviewsWritten,
    };
  }
}
