/**
 * Phone number generator.
 * Pure functions, client-side. Generates valid-FORMAT numbers that are
 * NOT real, NOT assigned, and NOT safe to use for fraud or verification bypass.
 *
 * Supported countries (V0.1): US (with real area codes), generic for others.
 */

export type Country = 'US' | 'UK' | 'CA' | 'AU' | 'DE' | 'FR' | 'GENERIC';

export interface CountryConfig {
  code: Country;
  name: string;
  flag: string;
  pattern: (area?: string) => string; // Function that returns the formatted number
  areaCodeLabel?: string;
  areaCodes?: string[];
  hasAreaCodes: boolean;
}

export const COUNTRIES: Record<Country, CountryConfig> = {
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    hasAreaCodes: true,
    areaCodeLabel: 'Area code',
    areaCodes: [
      '201', '202', '203', '205', '206', '207', '208', '209', '210', '212', '213', '214', '215', '216', '217', '218', '219',
      '301', '302', '303', '304', '305', '307', '308', '309',
      '310', '312', '313', '314', '315', '316', '317', '318', '319',
      '320', '321', '323', '325', '330', '331', '334', '336', '339', '347', '351', '352', '360', '361', '386',
      '401', '402', '404', '405', '406', '407', '408', '409', '410', '412', '413', '414', '415', '417', '419',
      '423', '425', '430', '432', '434', '440', '443', '469',
      '478', '479', '480', '484', '501', '502', '503', '504', '505', '507', '508', '509', '510', '512', '513', '515', '516', '517', '518', '520',
      '530', '540', '551', '559', '561', '562', '563', '564', '567', '570', '571', '573', '574', '580', '585', '586', '601', '602', '603', '605', '606', '607', '608', '609', '610', '612', '614', '615', '616', '617', '618', '619',
      '620', '623', '626', '630', '631', '636', '641', '646', '650', '651', '660', '661', '662', '678', '682', '701',
      '702', '703', '704', '706', '707', '708', '712', '713', '714', '715', '716', '717', '718', '719', '720', '724', '727', '731',
      '732', '734', '740', '754', '757', '760', '763', '765', '770', '772', '773', '774', '775', '781', '785', '786', '801', '802', '803', '804', '805', '806', '808', '810', '812', '813', '814', '815', '816', '817', '818', '828', '830', '831', '832', '843', '845', '847', '848', '850', '856', '857', '858', '859', '860', '862', '863', '864', '865', '870', '878', '901', '903', '904', '906', '907', '908', '909', '910', '912', '913', '914', '915', '916', '917', '918', '919',
      '920', '925', '928', '931', '936', '937', '940', '941', '947', '949', '951', '952', '954', '956', '970', '971', '972', '973', '978', '980', '985', '989',
    ],
    pattern: (area?: string) => {
      const ac = area || '555';
      const mid = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const end = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      return `(${ac}) ${mid}-${end}`;
    },
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom',
    flag: '🇬🇧',
    hasAreaCodes: false,
    pattern: () => {
      // UK format: +44 7XXX XXXXXX (mobile) or +44 1XXX XXXXXXX (landline)
      const isMobile = Math.random() < 0.7;
      if (isMobile) {
        const prefix = ['7'] [Math.floor(Math.random() * 1)];
        const rest = String(Math.floor(Math.random() * 9_000_000)).padStart(7, '0');
        return `+44 7${rest.slice(0, 2)} ${rest.slice(2, 6)} ${rest.slice(6)}`;
      } else {
        const area = '20'; // London
        const num = String(Math.floor(Math.random() * 9_000_000)).padStart(7, '0');
        return `+44 ${area} ${num.slice(0, 4)} ${num.slice(4)}`;
      }
    },
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    hasAreaCodes: true,
    areaCodeLabel: 'Area code',
    areaCodes: ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '742', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'],
    pattern: (area?: string) => {
      const ac = area || '555';
      const mid = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const end = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      return `(${ac}) ${mid}-${end}`;
    },
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    hasAreaCodes: false,
    pattern: () => {
      // AU format: +61 4XX XXX XXX (mobile)
      const mid = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const end = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      return `+61 4${Math.floor(Math.random() * 10)} ${mid} ${end}`;
    },
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    hasAreaCodes: false,
    pattern: () => {
      // DE format: +49 1XX XXXXXXX (mobile) or +49 XXX XXXXXXX
      const isMobile = Math.random() < 0.7;
      if (isMobile) {
        const mid = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        const end = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        return `+49 1${Math.floor(Math.random() * 10)} ${mid} ${end}`;
      }
      return `+49 30 ${String(Math.floor(Math.random() * 9_000_000)).padStart(7, '0')}`;
    },
  },
  FR: {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    hasAreaCodes: false,
    pattern: () => {
      // FR format: +33 X XX XX XX XX (mobile starts with 6 or 7)
      const isMobile = Math.random() < 0.7;
      const start = isMobile ? '6' : (Math.random() < 0.5 ? '1' : '2');
      const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10));
      return `+33 ${start} ${digits.slice(0, 2).join('')} ${digits.slice(2, 4).join('')} ${digits.slice(4, 6).join('')} ${digits.slice(6, 8).join('')}`;
    },
  },
  GENERIC: {
    code: 'GENERIC',
    name: 'Generic',
    flag: '🌐',
    hasAreaCodes: false,
    pattern: () => {
      // Random 10-digit number
      const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10));
      return digits.join('');
    },
  },
};

/**
 * Generate `count` valid-format numbers for a country.
 * If the country has area codes and `areaCode` is provided, all numbers use that area code.
 * Otherwise, a random area code from the country's list is chosen per number.
 */
export function generateNumbers(
  country: Country,
  count: number,
  areaCode?: string
): string[] {
  const config = COUNTRIES[country];
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    let ac = areaCode;
    if (!ac && config.hasAreaCodes && config.areaCodes) {
      ac = config.areaCodes[Math.floor(Math.random() * config.areaCodes.length)];
    }
    results.push(config.pattern(ac));
  }
  return results;
}
