// Constant values for Licenses sorted by id
const LicensesMap = new Map([
  [
    1,
    {
      id: 1,
      license_name: 'CC BY',
      exists: true,
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      license_description: '',
      copyright_holder_required: true,
      is_custom: false,
    },
  ],
  [
    2,
    {
      id: 2,
      license_name: 'CC BY-SA',
      exists: true,
      license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
      license_description: '',
      copyright_holder_required: true,
      is_custom: false,
    },
  ],
  [
    3,
    {
      id: 3,
      license_name: 'CC BY-ND',
      exists: true,
      license_url: 'https://creativecommons.org/licenses/by-nd/4.0/',
      license_description: '',
      copyright_holder_required: true,
      is_custom: false,
    },
  ],
  [
    4,
    {
      id: 4,
      license_name: 'CC BY-NC',
      exists: true,
      license_url: 'https://creativecommons.org/licenses/by-nc/4.0/',
      license_description: '',
      copyright_holder_required: true,
      is_custom: false,
    },
  ],
  [
    5,
    {
      id: 5,
      license_name: 'CC BY-NC-SA',
      exists: true,
      license_url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      license_description: '',
      copyright_holder_required: true,
      is_custom: false,
    },
  ],
  [
    6,
    {
      id: 6,
      license_name: 'CC BY-NC-ND',
      exists: true,
      license_url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
      license_description: '',
      copyright_holder_required: true,
      is_custom: false,
    },
  ],
  [
    7,
    {
      id: 7,
      license_name: 'All Rights Reserved',
      exists: true,
      license_url: 'http://www.allrights-reserved.com/',
      license_description: '',
      copyright_holder_required: true,
      is_custom: false,
    },
  ],
  [
    8,
    {
      id: 8,
      license_name: 'Public Domain',
      exists: true,
      license_url: 'https://creativecommons.org/publicdomain/mark/1.0/',
      license_description: '',
      copyright_holder_required: false,
      is_custom: false,
    },
  ],
  [
    9,
    {
      id: 9,
      license_name: 'Special Permissions',
      exists: false,
      license_url: '',
      license_description: '',
      copyright_holder_required: true,
      is_custom: true,
    },
  ],
]);

export default LicensesMap;

export const LicensesList = Array.from(LicensesMap.values());
