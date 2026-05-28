-- Seed an admin login account. Idempotent: re-running the migration on an
-- existing database is a no-op because of ON CONFLICT DO NOTHING.
-- Password (bcrypt cost 12) corresponds to plaintext: Password123!
INSERT INTO "users" (
    "id",
    "email",
    "phone",
    "passwordHash",
    "firstName",
    "lastName",
    "role",
    "languagePreference",
    "isEmailVerified",
    "isPhoneVerified",
    "isActive",
    "twoFactorEnabled",
    "createdAt",
    "updatedAt"
) VALUES (
    '00000000-0000-4000-a000-000000000001',
    'admin@ndipaano.co.zm',
    '+260970000001',
    '$2b$12$O.8gtOVFyTKc5NMtQJkWduOFRPpuk7mRdsvcXXh.qbQCQgDH2PPMq',
    'Admin',
    'Ndipaano',
    'ADMIN',
    'en',
    true,
    true,
    true,
    false,
    NOW(),
    NOW()
)
ON CONFLICT ("email") DO NOTHING;
