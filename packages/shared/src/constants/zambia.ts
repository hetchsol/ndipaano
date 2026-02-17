import { PractitionerType } from '../types/enums';

// ─── Zambian Provinces ───────────────────────────────────────────────────────

export const ZAMBIAN_PROVINCES = [
  { code: 'CP', name: 'Central Province' },
  { code: 'CB', name: 'Copperbelt Province' },
  { code: 'EP', name: 'Eastern Province' },
  { code: 'LP', name: 'Luapula Province' },
  { code: 'LS', name: 'Lusaka Province' },
  { code: 'MC', name: 'Muchinga Province' },
  { code: 'NP', name: 'Northern Province' },
  { code: 'NW', name: 'North-Western Province' },
  { code: 'SP', name: 'Southern Province' },
  { code: 'WP', name: 'Western Province' },
] as const;

// ─── Key Districts Per Province ──────────────────────────────────────────────

export const ZAMBIAN_DISTRICTS: Record<string, string[]> = {
  CP: ['Kabwe', 'Kapiri Mposhi', 'Mkushi', 'Serenje', 'Mumbwa', 'Chibombo', 'Chisamba', 'Chitambo', 'Luano', 'Ngabwe', 'Shibuyunji'],
  CB: ['Ndola', 'Kitwe', 'Mufulira', 'Luanshya', 'Chingola', 'Kalulushi', 'Chililabombwe', 'Lufwanyama', 'Masaiti', 'Mpongwe'],
  EP: ['Chipata', 'Petauke', 'Katete', 'Lundazi', 'Chadiza', 'Mambwe', 'Nyimba', 'Sinda', 'Vubwi'],
  LP: ['Mansa', 'Samfya', 'Nchelenge', 'Kawambwa', 'Mwense', 'Milenge', 'Chembe', 'Chipili', 'Lunga', 'Mwansabombwe'],
  LS: ['Lusaka', 'Kafue', 'Chongwe', 'Luangwa', 'Chilanga', 'Chirundu', 'Rufunsa'],
  MC: ['Chinsali', 'Mpika', 'Nakonde', 'Isoka', 'Mafinga', 'Shiwang\'andu', 'Chama', 'Kanchibiya', 'Lavushimanda'],
  NP: ['Kasama', 'Mbala', 'Mpulungu', 'Mungwi', 'Luwingu', 'Kaputa', 'Mporokoso', 'Chilubi', 'Lupososhi', 'Lunte', 'Nsama', 'Senga Hill'],
  NW: ['Solwezi', 'Kasempa', 'Mwinilunga', 'Zambezi', 'Kabompo', 'Mufumbwe', 'Chavuma', 'Ikelenge', 'Kalumbila', 'Mushindamo'],
  SP: ['Livingstone', 'Choma', 'Mazabuka', 'Monze', 'Namwala', 'Kalomo', 'Kazungula', 'Siavonga', 'Sinazongwe', 'Gwembe', 'Pemba', 'Zimba'],
  WP: ['Mongu', 'Senanga', 'Sesheke', 'Kaoma', 'Kalabo', 'Shangombo', 'Lukulu', 'Limulunga', 'Mulobezi', 'Mwandi', 'Nalolo', 'Nkeyema', 'Sikongo', 'Sioma'],
};

// ─── Zambian Languages ───────────────────────────────────────────────────────

export const ZAMBIAN_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'bem', name: 'Bemba' },
  { code: 'nya', name: 'Nyanja' },
  { code: 'ton', name: 'Tonga' },
  { code: 'loz', name: 'Lozi' },
  { code: 'kqn', name: 'Kaonde' },
  { code: 'lun', name: 'Lunda' },
  { code: 'lue', name: 'Luvale' },
] as const;

// ─── HPCZ Categories ─────────────────────────────────────────────────────────

/**
 * Health Professions Council of Zambia (HPCZ) registration categories
 * mapped to practitioner types used in the platform.
 */
export const HPCZ_CATEGORIES: Record<PractitionerType, string> = {
  [PractitionerType.DOCTOR]: 'Medical Practitioners',
  [PractitionerType.NURSE]: 'Nurses and Midwives',
  [PractitionerType.CLINICAL_OFFICER]: 'Clinical Officers',
  [PractitionerType.PHYSIOTHERAPIST]: 'Physiotherapy and Rehabilitation',
  [PractitionerType.PHARMACIST]: 'Pharmacy',
  [PractitionerType.LAB_TECHNICIAN]: 'Biomedical Sciences',
  [PractitionerType.MIDWIFE]: 'Nurses and Midwives',
  [PractitionerType.DENTIST]: 'Dental Practitioners',
  [PractitionerType.PSYCHOLOGIST]: 'Clinical Psychology',
  [PractitionerType.NUTRITIONIST]: 'Nutrition and Dietetics',
};

// ─── ZAMRA Controlled Substances Schedules ───────────────────────────────────

/**
 * Zambia Medicines Regulatory Authority (ZAMRA) controlled substance schedules.
 * Based on the Narcotic Drugs and Psychotropic Substances Act.
 */
export const ZAMRA_CONTROLLED_SUBSTANCES = {
  SCHEDULE_I: {
    name: 'Schedule I',
    description:
      'Substances with high abuse potential and no accepted medical use. Includes opium derivatives, coca leaf derivatives, and cannabis.',
    examples: ['Heroin', 'Cannabis resin', 'LSD', 'MDMA'],
  },
  SCHEDULE_II: {
    name: 'Schedule II',
    description:
      'Substances with high abuse potential but accepted medical use under strict supervision.',
    examples: ['Morphine', 'Codeine', 'Fentanyl', 'Methadone', 'Pethidine'],
  },
  SCHEDULE_III: {
    name: 'Schedule III',
    description:
      'Substances with moderate abuse potential and accepted medical use.',
    examples: ['Barbiturates', 'Buprenorphine', 'Pentazocine'],
  },
  SCHEDULE_IV: {
    name: 'Schedule IV',
    description:
      'Substances with low abuse potential relative to Schedule III.',
    examples: ['Benzodiazepines', 'Diazepam', 'Lorazepam', 'Zolpidem'],
  },
  SCHEDULE_V: {
    name: 'Schedule V',
    description:
      'Preparations containing limited quantities of certain narcotic drugs.',
    examples: [
      'Cough preparations with codeine',
      'Anti-diarrheal preparations with diphenoxylate',
    ],
  },
  SCHEDULE_VI: {
    name: 'Schedule VI',
    description:
      'Precursor chemicals used in the manufacture of controlled substances.',
    examples: ['Ephedrine', 'Pseudoephedrine', 'Ergometrine', 'Lysergic acid'],
  },
} as const;

// ─── Currency & Country ──────────────────────────────────────────────────────

/** Zambian Kwacha currency code (ISO 4217) */
export const CURRENCY = 'ZMW';

/** Zambia international dialing code */
export const COUNTRY_CODE = '+260';

// ─── Emergency Numbers ───────────────────────────────────────────────────────

export const EMERGENCY_NUMBERS = {
  police: '999',
  ambulance: '991',
  fire: '993',
} as const;

// ─── Service Configuration ───────────────────────────────────────────────────

/** Default search radius for finding nearby practitioners (in kilometers) */
export const DEFAULT_SERVICE_RADIUS_KM = 25;

/** Maximum allowed service radius for practitioners (in kilometers) */
export const MAX_SERVICE_RADIUS_KM = 100;

/** Platform commission percentage taken from each booking payment */
export const PLATFORM_COMMISSION_PERCENT = 15;
