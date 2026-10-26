Feature: Manage organizations
	Studio users need to be able to create organizations, invite members with a role, move channels into an organization and work on those channels according to their organization role. Studio administrators need to be able to review channel migrations that cannot be done automatically.

	Background:
		Given Kolibri Studio is accessible at https://studio.learningequality.org/ or any of the test environments
			And I am signed in to Studio

	# End-to-end workflow

	Scenario Outline: Create an organization, invite members, move a channel into it and collaborate on it
		Given there are three Studio accounts: <admin>, <editor> and <viewer>
			And <admin> is the only editor of a channel <channel> that is not part of any organization
			And I am signed in to Studio as <admin>
		When I click the *My organizations* tab
			And I click the *New organization* button
			And I type <organization> in the *Organization name* field
			And I click the *Create organization* button
		Then I see the *Organization created* message
			And I see the *Details*, *Channels* and *Sharing* tabs of <organization>
		When I click the *Sharing* tab
			And I type the email of <editor> in the *Email* field
			And I select *Editor* in the *Role type* drop-down
			And I click the *Send invitation* button
		Then I see the *Invitation sent* message
			And I see <editor> in the *Users* table with the role *Pending Editor*
		When I invite <viewer> with the *Viewer* role
		Then I see <viewer> in the *Users* table with the role *Pending Viewer*

		When I sign in as <editor>
			And I go to the *My organizations* page
		Then I see the *You have 1 invitation* banner with the text *<admin> has invited you to edit <organization>*
		When I click the accept icon button for <organization>
		Then I see the <organization> card with the role *Editor*
		When I sign in as <viewer> and accept the invitation to <organization> in the same way
		Then I see the <organization> card with the role *Viewer*

		When I sign in as <admin>
			And I open the details of <channel>
			And I select <organization> in the *Channel organization* drop-down
			And I save the channel organization
		Then I see the *Channel organization saved.* message
		When I go to *My organizations* and open the *Channels* tab of <organization>
		Then I see <channel> in the table with its size
			And I see the *Total size* below the table
		When I go to *Settings > Storage*
		Then the storage I am using no longer includes the files of <channel>

		When I sign in as <editor>
			And I go to *My channels*
			And I select <organization> in the *Filter by organization* drop-down
		Then I see <channel> in the list of channels
		When I open <channel>
		Then I can edit its resources
		When I sign in as <viewer>
			And I open <channel> from the *Channels* tab of <organization>
		Then I can view its resources
			And I cannot edit, move, delete or add resources

		When I sign in as <admin>
			And I go to the *Sharing* tab of <organization>
			And I select *Remove from organization* in the options of <viewer>
			And I click the *Remove* button
		Then I see the *User removed from organization* message
		When I sign in as <viewer>
		Then I no longer see <organization> on the *My organizations* page
			And I can no longer open <channel>

		Examples:
		| admin             | editor             | viewer             | organization | channel     |
		| admin@example.com | editor@example.com | viewer@example.com | Test org     | Org channel |

	# Create and edit an organization

	Scenario: See an empty organizations page
		Given I am not a member of any organization
		When I go to the *My organizations* page
		Then I see the *Organizations* heading
			And I see the *New organization* button
			And I see the message *You are not a member of any organizations yet.*

	Scenario: Create an organization
		Given I am at the *My organizations* page
		When I click the *New organization* button
		Then I see the *New organization* page with the *Organization name* and *Organization description* fields
			And I do not see the *Details*, *Channels* and *Sharing* tabs
		When I fill in the *Organization name* and *Organization description* fields
			And I click the *Create organization* button
		Then I see the *Organization created* message
			And I see the *Details*, *Channels* and *Sharing* tabs of the new organization
		When I go back to the *My organizations* page
		Then I see the new organization's card with the role *Admin*

	Scenario: Organization name is required
		Given I am at the *New organization* page
		When I leave the *Organization name* field empty
			And I click the *Create organization* button
		Then I see the *Organization name is required* error
			And no organization is created

	Scenario: Create an organization from *My channels*
		Given I am at *My channels*
		When I click the *Create* button next to the *Filter by organization* drop-down
		Then I see the *New organization* page

	Scenario: Edit the details of an organization as an admin
		Given I am an admin of an organization
			And I am at the *My organizations* page
		When I click the organization's card
		Then I am at the *Details* tab of the organization
		When I change the *Organization name* and *Organization description*
			And I click the *Save changes* button
		Then I see the *Changes saved* message
			And I see the new name on the organization's card at the *My organizations* page

	Scenario: Open the edit page from the card options
		Given I am a member of an organization
			And I am at the *My organizations* page
		When I click the *More options* button on the organization's card
			And I select *Edit organization*
		Then I am at the *Details* tab of the organization

	Scenario Outline: Organization details are read-only for non-admin members
		Given I am an active <role> of an organization
		When I open the *Details* tab of the organization
		Then I see the organization fields disabled
			And I see the notice *Only organization admins can edit these details.*
			And I do not see the *Save changes* button

		Examples:
		| role   |
		| editor |
		| viewer |

	# Invite users to an organization

	Scenario Outline: Invite a user with a role
		Given I am an admin of an organization
			And I am at the *Sharing* tab of the organization
		When I type the email of a Studio user in the *Email* field
			And I select <role> in the *Role type* drop-down
			And I click the *Send invitation* button
		Then I see the *Invitation sent* message
			And I see the user in the *Users* table with the role <pending role>
			And the user receives an email inviting them to the organization

		Examples:
		| role   | pending role   |
		| Viewer | Pending Viewer |
		| Editor | Pending Editor |
		| Admin  | Pending Admin  |

	Scenario: Email is required
		Given I am an admin of an organization
			And I am at the *Sharing* tab of the organization
		When I leave the *Email* field empty
			And I click the *Send invitation* button
		Then I see the *Email is required* error

	Scenario: Resend a pending invitation
		Given I am an admin of an organization
			And I have invited a user who has not responded yet
			And I am at the *Sharing* tab of the organization
		When I click the *Options* button for the invited user
			And I select *Resend invitation*
		Then I see the *Invitation resent* message

	Scenario: Revoke a pending invitation
		Given I am an admin of an organization
			And I have invited a user who has not responded yet
			And I am at the *Sharing* tab of the organization
		When I click the *Options* button for the invited user
			And I select *Revoke invitation*
		Then I see the *Revoke invitation* modal with the text *Are you sure you want to revoke the invitation for <email>?*
		When I click the *Revoke* button
		Then I see the *Invitation revoked* message
			And I no longer see the user in the *Users* table
			And the user no longer sees the invitation on their *My organizations* page

	Scenario Outline: Non-admin members cannot manage sharing
		Given I am an active <role> of an organization
		When I open the *Sharing* tab of the organization
		Then I see the notice *Only organization admins can manage sharing settings.*
			And I do not see the *Invite users* form or the *Users* table

		Examples:
		| role   |
		| editor |
		| viewer |

	# Respond to organization invitations

	Scenario Outline: See a pending invitation
		Given an organization admin has invited me to an organization with the <role> role
		When I go to the *My organizations* page
		Then I see the *You have 1 invitation* banner
			And I see the text <invitation text>

		Examples:
		| role   | invitation text                                 |
		| Viewer | <sender> has invited you to view <organization> |
		| Editor | <sender> has invited you to edit <organization> |
		| Admin  | <sender> has invited you to own <organization>  |

	Scenario: Accept an invitation
		Given an organization admin has invited me to an organization
			And I am at the *My organizations* page
		When I click the accept icon button with the tooltip *Accept invitation to <organization>*
		Then I no longer see the invitation
			And I see the organization's card with the role I was invited with
			And the organization admin sees me in the *Users* table with that role

	Scenario: Decline an invitation
		Given an organization admin has invited me to an organization
			And I am at the *My organizations* page
		When I click the decline icon button with the tooltip *Decline invitation to <organization>*
		Then I see the *Declining invitation* modal with the text *Are you sure you want to decline this invitation?*
		When I click the *Decline* button
		Then I no longer see the invitation
			And I do not see the organization's card
			And the organization admin no longer sees me as pending in the *Users* table

	Scenario: Cancel declining an invitation
		Given an organization admin has invited me to an organization
			And I am at the *My organizations* page
		When I click the decline icon button for the invitation
			And I click the *Cancel* button in the *Declining invitation* modal
		Then I still see the invitation

	# Manage organization members

	Scenario: See the organization members
		Given I am an admin of an organization that has other active members
			And I am at the *Sharing* tab of the organization
		When I look at the *Users* table
		Then I see the *Name*, *Email*, *Role* and *Options* columns
			And I see every active member and every pending invitation of the organization

	Scenario Outline: Change the role of a member
		Given I am an admin of an organization
			And a member of the organization has the <current role> role
			And I am at the *Sharing* tab of the organization
		When I click the *Options* button for the member
			And I select <action>
		Then I see the member's role change to <new role> in the *Users* table
			And the member sees the role <new role> on the organization's card

		Examples:
		| current role | action      | new role |
		| Viewer       | Make editor | Editor   |
		| Editor       | Make admin  | Admin    |
		| Admin        | Make viewer | Viewer   |

	Scenario: Remove a member from the organization
		Given I am an admin of an organization that has other active members
			And I am at the *Sharing* tab of the organization
		When I click the *Options* button for a member
			And I select *Remove from organization*
		Then I see the *Remove from organization* modal with the text *Are you sure you want to remove <email> from this organization?*
		When I click the *Remove* button
		Then I see the *User removed from organization* message
			And I no longer see the member in the *Users* table
			And the member no longer sees the organization on their *My organizations* page
			And the member can no longer open the organization's channels unless they are a direct editor or viewer of them

	# Access organization channels by role

	Scenario Outline: Organization admins and editors can edit organization channels
		Given there is an organization with a channel
			And I am not a direct editor or viewer of the channel
			And I am an active <role> of the organization
		When I go to *My channels*
		Then I see the channel in the list of channels
		When I open the channel
		Then I can add, edit, move and delete resources
			And I can edit exercises and their questions
			And I can upload files to the channel

		Examples:
		| role   |
		| admin  |
		| editor |

	Scenario: Organization viewers can view organization channels
		Given there is an organization with a channel
			And I am not a direct editor or viewer of the channel
			And I am an active viewer of the organization
		When I open the channel from the *Channels* tab of the organization
		Then I can view the channel's resources, exercises and files
			And I do not see the options to add, edit, move or delete resources

	Scenario: Removed members cannot access organization channels
		Given there is an organization with a channel
			And I am not a direct editor or viewer of the channel
			And I was an active member of the organization and I have been removed from it
		When I try to open the channel
		Then I cannot see the channel or its resources

	Scenario: Filter *My channels* by organization
		Given I am an active editor of an organization that has channels
			And I am a direct editor of a channel that is not part of the organization
			And I am at *My channels*
		When I select the organization in the *Filter by organization* drop-down
		Then I see only the channels that are part of the organization
			And the selected organization is kept in the page URL
		When I reload the page
		Then I still see only the channels that are part of the organization
		When I select *All organizations* in the *Filter by organization* drop-down
		Then I see all the channels I can edit

	# Move a channel to an organization

	Scenario: Only organizations I can edit are offered
		Given I am an editor of a channel
			And I am an active editor or admin of one organization and an active viewer of another
			And I am at the channel details
		When I open the *Channel organization* drop-down
		Then I see the organizations where I am an active editor or admin
			And I do not see the organizations where I am only a viewer

	Scenario: Move a channel when every channel editor is in the organization
		Given I am an editor of a channel that is not part of an organization
			And every editor of the channel is an active editor or admin of an organization
			And I am at the channel details
		When I select the organization in the *Channel organization* drop-down
			And I save the channel organization
		Then I see the *Channel organization saved.* message
		When I reload the page
		Then I still see the organization in the *Channel organization* drop-down
			And I see the channel in the *Channels* tab of the organization

	Scenario: Request approval when a channel editor is not in the organization
		Given I am an editor of a channel that is not part of an organization
			And I am an active editor or admin of an organization
			And another editor of the channel is not an active editor or admin of the organization
			And I am at the channel details
		When I select the organization in the *Channel organization* drop-down
		Then I see the message *Migration cannot be done automatically. Create a ticket with website administrators below.*
			And I see the *Create ticket* button
		When I click the *Create ticket* button
		Then I see the message *Migration to <organization> is awaiting review.*
			And I cannot change the channel organization
			And the request does not appear as a channel sharing invitation

	Scenario: Decline my own pending migration request
		Given I have created a migration ticket for a channel
			And I am at the channel details
		When I click the *Decline* button next to the pending migration
		Then I see the message *Migration request declined.*
			And I can select an organization in the *Channel organization* drop-down again

	# Administration - review contested migrations

	Scenario: Studio administrators can move any channel without approval
		Given I am signed in as an administrator user
			And I am at the details of a channel in *Administration > Channels*
		When I select an organization in the *Channel organization* drop-down
			And I click the *Save organization* button
		Then I see the *Channel organization saved.* message

	Scenario: See the contested migrations
		Given I am signed in as an administrator user
			And there are pending migration requests
		When I go to *Administration > Migrations*
		Then I see the *Contested migrations* heading
			And I see an *N contested migrations* label with the number of pending requests
			And I see the following table columns: Channel, Organization, Requestor, Options

	Scenario: No contested migrations
		Given I am signed in as an administrator user
			And there are no pending migration requests
		When I go to *Administration > Migrations*
		Then I see the message *No contested migrations*

	Scenario: Accept a migration request
		Given I am signed in as an administrator user
			And there is a pending migration request for <channel>
			And I am at *Administration > Migrations*
		When I click the *Options* button for the request
			And I select *Accept*
		Then I see the message *Migration for <channel> accepted.*
			And I no longer see the request in the table
			And <channel> appears in the *Channels* tab of the requested organization
			And the requestor no longer sees the request as awaiting review

	Scenario: Decline a migration request
		Given I am signed in as an administrator user
			And there is a pending migration request for <channel>
			And I am at *Administration > Migrations*
		When I click the *Options* button for the request
			And I select *Decline*
		Then I see the message *Migration for <channel> declined.*
			And I no longer see the request in the table
			And <channel> keeps its previous organization
			And the requestor can select an organization for <channel> again

	Scenario: Regular users cannot review migrations
		Given I am not a Studio administrator
		When I try to open *Administration > Migrations*
		Then I cannot see or resolve any migration requests

	# View organization storage

	Scenario: View the size of each organization channel and the total size
		Given I am an active member of an organization that has channels
			And I am at the *My organizations* page
		When I click the organization
			And I click the *Channels* tab
		Then I see a table with the name, description and size of each of the organization's channels
			And I see the total size of the listed channels below the table

	Scenario: Open an organization channel from the channels table
		Given I am at the *Channels* tab of an organization
		When I click the name of a channel
		Then I see the channel open in a new browser tab

	Scenario: Organization without channels
		Given I am an active member of an organization that has no channels
		When I open the *Channels* tab of the organization
		Then I see the message *This organization has no channels yet.*

	Scenario: Organization channels do not count towards my storage
		Given I am an editor of a channel that is not part of an organization
			And I am at *Settings > Storage*
			And I see how much storage I am using
		When the channel becomes part of an organization
			And I reload *Settings > Storage*
		Then I see that the storage I am using no longer includes the channel's files
