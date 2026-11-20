Feature: Invite users to an organization
	An organization admin needs to be able to invite users to the organization with a role, and to follow up on invitations that are still pending

	Background:
		Given I am signed in to Studio
			And I am an admin of an organization
			And I am at the *Sharing* tab of the organization

	Scenario Outline: Invite a user with a role
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
		When I leave the *Email* field empty
			And I click the *Send invitation* button
		Then I see the *Email is required* error

	Scenario: Resend a pending invitation
		Given I have invited a user who has not responded yet
		When I click the *Options* button for the invited user
			And I select *Resend invitation*
		Then I see the *Invitation resent* message

	Scenario: Revoke a pending invitation
		Given I have invited a user who has not responded yet
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
