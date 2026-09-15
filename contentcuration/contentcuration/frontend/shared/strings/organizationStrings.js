import { createTranslator } from 'shared/i18n';

export const organizationStrings = createTranslator('OrganizationStrings', {
  adminRole: {
    message: 'Admin',
    context: 'Label for the organization admin role',
  },
  editorRole: {
    message: 'Editor',
    context: 'Label for the organization editor role',
  },
  viewerRole: {
    message: 'Viewer',
    context: 'Label for the organization viewer role',
  },
  pendingAdminRole: {
    message: 'Pending Admin',
    context: 'Label shown next to a pending invitation for the admin role',
  },
  pendingEditorRole: {
    message: 'Pending Editor',
    context: 'Label shown next to a pending invitation for the editor role',
  },
  pendingViewerRole: {
    message: 'Pending Viewer',
    context: 'Label shown next to a pending invitation for the viewer role',
  },
  cancel: {
    message: 'Cancel',
    context: 'A label for an action that cancels a dialog',
  },
  moreOptions: {
    message: 'More options for {name}',
    context: 'Accessible label for the options button on an organization card, naming the organization',
  },
  editOrganization: {
    message: 'Edit organization',
    context: 'Label for a menu option that opens an organization for editing',
  },
  organizationDetails: {
    message: 'Organization details',
    context: 'Heading for the organization details form',
  },
  nameLabel: {
    message: 'Organization name',
    context: 'Label for the organization name text field',
  },
  descriptionLabel: {
    message: 'Organization description',
    context: 'Label for the organization description text field',
  },
  nameRequired: {
    message: 'Organization name is required',
    context: 'Validation message shown when the organization name field is left blank',
  },
  adminAccessRequiredForEdits: {
    message: 'Only organization admins can edit these details.',
    context: 'Notice shown to non-admin members viewing an organization\'s details in read-only mode',
  },
  saveChanges: {
    message: 'Save changes',
    context: 'Label for the button that saves changes to an existing organization',
  },
  createOrganization: {
    message: 'Create organization',
    context: 'Label for the button that creates a new organization',
  },
  changesSaved: {
    message: 'Changes saved',
    context: 'Confirmation message shown after successfully saving organization details',
  },
  organizationCreated: {
    message: 'Organization created',
    context: 'Confirmation message shown after successfully creating a new organization',
  },
  saveError: {
    message: 'Unable to save these changes',
    context: 'Error message shown when saving organization details fails',
  },
  tabsLabel: {
    message: 'Organization edit tabs',
    context: 'Accessible label for the tab list on the organization edit page',
  },
  detailsTab: {
    message: 'Details',
    context: 'Label for the organization details tab',
  },
  sharingTab: {
    message: 'Sharing',
    context: 'Label for the organization sharing/members tab',
  },
  newOrganizationTitle: {
    message: 'New organization',
    context: 'Header title shown when creating a new organization',
  },
  editText: {
    message: '{sender} has invited you to edit {organization}',
    context: 'Message shown for a pending invitation granting edit access to an organization',
  },
  viewText: {
    message: '{sender} has invited you to view {organization}',
    context: 'Message shown for a pending invitation granting view access to an organization',
  },
  ownText: {
    message: '{sender} has invited you to own {organization}',
    context: 'Message shown for a pending invitation granting admin access to an organization',
  },
  accept: {
    message: 'Accept invitation to {organization}',
    context: 'Accessible tooltip for the button that accepts a pending organization invitation',
  },
  declineTooltip: {
    message: 'Decline invitation to {organization}',
    context: 'Accessible tooltip for the button that opens the decline-invitation confirmation',
  },
  decline: {
    message: 'Decline',
    context: 'Label for the button that confirms declining an organization invitation',
  },
  decliningInvitation: {
    message: 'Declining invitation',
    context: 'Title for the confirmation dialog shown when declining an organization invitation',
  },
  decliningInvitationMessage: {
    message: 'Are you sure you want to decline this invitation?',
    context: 'Body text for the confirmation dialog shown when declining an organization invitation',
  },
  notAdmin: {
    message: 'Only organization admins can manage sharing settings.',
    context: 'Notice shown to non-admin members instead of the sharing/invite form',
  },
  users: {
    message: 'Users',
    context: 'Heading and accessible caption for the organization members table',
  },
  name: {
    message: 'Name',
    context: 'Column header for a member\'s name in the organization members table',
  },
  email: {
    message: 'Email',
    context: 'Column header for a member\'s email in the organization members table',
  },
  role: {
    message: 'Role',
    context: 'Column header for a member\'s role in the organization members table',
  },
  options: {
    message: 'Options',
    context: 'Column header for the row actions menu in the organization members table',
  },
  optionsFor: {
    message: 'Options for {email}',
    context: 'Accessible label for a row\'s options button in the organization members table, naming the member\'s email',
  },
  resendInvitation: {
    message: 'Resend invitation',
    context: 'Label for the menu option that resends a pending organization invitation',
  },
  revokeInvitation: {
    message: 'Revoke invitation',
    context: 'Label for the menu option that revokes a pending organization invitation',
  },
  makeViewer: {
    message: 'Make viewer',
    context: 'Label for the menu option that changes a member\'s role to viewer',
  },
  makeEditor: {
    message: 'Make editor',
    context: 'Label for the menu option that changes a member\'s role to editor',
  },
  makeAdmin: {
    message: 'Make admin',
    context: 'Label for the menu option that changes a member\'s role to admin',
  },
  closeRole: {
    message: 'Remove from organization',
    context: 'Label for the menu option that removes a member from the organization',
  },
  invitationResent: {
    message: 'Invitation resent',
    context: 'Confirmation message shown after resending a pending organization invitation',
  },
  invitationRevoked: {
    message: 'Invitation revoked',
    context: 'Confirmation message shown after revoking a pending organization invitation',
  },
  roleClosed: {
    message: 'User removed from organization',
    context: 'Confirmation message shown after removing a member from the organization',
  },
  genericMembershipError: {
    message: 'Unable to update this member',
    context: 'Fallback error message shown when a membership action fails without a specific server message',
  },
  closeRoleTitle: {
    message: 'Remove from organization',
    context: 'Title for the confirmation dialog shown when removing a member from the organization',
  },
  closeRoleText: {
    message: 'Are you sure you want to remove {email} from this organization?',
    context: 'Body text for the confirmation dialog shown when removing a member from the organization',
  },
  closeRoleConfirm: {
    message: 'Remove',
    context: 'Label for the button that confirms removing a member from the organization',
  },
  revokeInvitationTitle: {
    message: 'Revoke invitation',
    context: 'Title for the confirmation dialog shown when revoking a pending organization invitation',
  },
  revokeInvitationText: {
    message: 'Are you sure you want to revoke the invitation for {email}?',
    context: 'Body text for the confirmation dialog shown when revoking a pending organization invitation',
  },
  revokeInvitationConfirm: {
    message: 'Revoke',
    context: 'Label for the button that confirms revoking a pending organization invitation',
  },
  inviteUsers: {
    message: 'Invite users',
    context: 'Heading for the invite-by-email form on the organization sharing tab',
  },
  emailLabel: {
    message: 'Email',
    context: 'Label for the email text field on the invite-by-email form',
  },
  emailRequired: {
    message: 'Email is required',
    context: 'Validation message shown when the invite form\'s email field is left blank',
  },
  roleLabel: {
    message: 'Role type',
    context: 'Label for the role selector on the invite-by-email form',
  },
  sendInvitation: {
    message: 'Send invitation',
    context: 'Label for the button that sends an organization invitation',
  },
  invitationSent: {
    message: 'Invitation sent',
    context: 'Confirmation message shown after successfully sending an organization invitation',
  },
  invitationError: {
    message: 'Unable to send this invitation',
    context: 'Error message shown when sending an organization invitation fails',
  },
  title: {
    message: 'Organizations',
    context: 'Page heading for the My Organizations page',
  },
  newOrganization: {
    message: 'New organization',
    context: 'Label for the button on the My Organizations page that starts creating a new organization',
  },
  noOrganizationsFound: {
    message: 'You are not a member of any organizations yet.',
    context: 'Message shown on the My Organizations page when the user belongs to no organizations',
  },
  invitations: {
    message: 'You have {count, plural,\n =1 {# invitation}\n other {# invitations}}',
    context: 'Header for the banner listing the user\'s pending organization invitations',
  },
  invitationActionError: {
    message: 'Unable to complete this action',
    context: 'Fallback error message shown when accepting or declining an organization invitation fails',
  },
});
