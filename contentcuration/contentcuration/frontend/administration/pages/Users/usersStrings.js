import { createTranslator } from 'shared/i18n';

export const usersStrings = createTranslator('UsersStrings', {
  userCount: {
    message: '{count, plural,\n =1 {# user}\n other {# users}}',
    context: 'Heading above the administration users table, showing how many users match',
  },
  emailUsersAction: {
    message: 'Email {count, plural,\n =1 {# user}\n other {# users}}',
    context: 'Action to email every user matching the current filters',
  },
  emailAction: {
    message: 'Email',
    context: 'Action to email the users selected in the table',
  },
  downloadCSVAction: {
    message: 'Download CSV',
    context: 'Action to export the filtered users as a CSV file',
  },
  clearFiltersAction: {
    message: 'Clear filters',
    context: 'Action to remove every filter applied to the users table',
  },

  userTypeLabel: {
    message: 'User Type',
    context: 'Label of the dropdown filtering users by their type, such as administrators',
  },
  targetLocationLabel: {
    message: 'Target location',
    context: 'Label of the dropdown filtering users by the country they work in',
  },
  searchLabel: {
    message: 'Search for a user...',
    context: 'Placeholder of the users search field',
  },
  searchHint: {
    message: 'Search for users by their names, emails, or channels',
    context: 'Hint below the users search field explaining what it matches',
  },
  joinedWithinLabel: {
    message: 'Joined within',
    context: 'Label of the dropdown filtering users by how recently they registered',
  },
  activeWithinLabel: {
    message: 'Active within',
    context: 'Label of the dropdown filtering users by how recently they signed in',
  },
  hasPublishedLabel: {
    message: 'Has published a channel',
    context: 'Checkbox filtering to users who have published at least one channel',
  },
  hasStudioActivityLabel: {
    message: 'Has Studio activity',
    context: 'Checkbox filtering to users who have ever made a change in Studio',
  },

  userTypeAll: {
    message: 'All',
    context: 'User type option that applies no filtering',
  },
  userTypeActive: {
    message: 'Active',
    context: 'User type option for accounts that are currently active',
  },
  userTypeInactive: {
    message: 'Inactive',
    context: 'User type option for accounts that have been deactivated',
  },
  userTypeAdministrators: {
    message: 'Administrators',
    context: 'User type option for accounts with administrator privileges',
  },
  userTypeSushiChef: {
    message: 'Sushi chef',
    context:
      'User type option for accounts that upload content using a Sushi Chef script. Sushi Chef is a proper name and is not translated.',
  },
  booleanFilterAny: {
    message: 'Any',
    context: 'Option of a checkbox filter meaning that the filter is not applied',
  },

  dateWindowAnyTime: {
    message: 'Any time',
    context: 'Date range option that applies no filtering',
  },
  dateWindowLastMonth: {
    message: 'Last month',
    context: 'Date range option covering the past month',
  },
  dateWindowLast3Months: {
    message: 'Last 3 months',
    context: 'Date range option covering the past three months',
  },
  dateWindowLast6Months: {
    message: 'Last 6 months',
    context: 'Date range option covering the past six months',
  },
  dateWindowLastYear: {
    message: 'Last year',
    context: 'Date range option covering the past year',
  },

  nameHeader: {
    message: 'Name',
    context: "Column heading for the user's name",
  },
  emailHeader: {
    message: 'Email',
    context: "Column heading for the user's email address",
  },
  diskSpaceHeader: {
    message: 'Disk space',
    context: 'Column heading for how much storage the user has been granted',
  },
  canEditHeader: {
    message: 'Can edit',
    context: 'Column heading for how many channels the user can edit',
  },
  canViewHeader: {
    message: 'Can view',
    context: 'Column heading for how many channels the user can view',
  },
  dateJoinedHeader: {
    message: 'Date joined',
    context: 'Column heading for when the user registered',
  },
  lastActiveHeader: {
    message: 'Last active',
    context: 'Column heading for when the user last signed in',
  },
  actionsHeader: {
    message: 'Actions',
    context: 'Column heading for the per-user actions menu',
  },

  loadingMessage: {
    message: 'Loading...',
    context: 'Shown in the table while users are being fetched',
  },
  noUsersFoundMessage: {
    message: 'No users found',
    context: 'Shown in the table when no users match the current filters',
  },
  generatingCSVMessage: {
    message: 'Generating CSV...',
    context: 'Notification shown while the CSV export is being prepared',
  },
  noFiltersAppliedMessage: {
    message: 'No filters applied. Pick at least one filter and try again.',
    context: 'Notification shown when a CSV export is attempted with no filters set',
  },
  csvDownloadFailedMessage: {
    message: 'CSV download failed. Try again.',
    context: 'Notification shown when the CSV export request fails',
  },

  tabTitle: {
    message: 'Users - Administration',
    context: 'Browser tab title for the administration users page',
  },
});
