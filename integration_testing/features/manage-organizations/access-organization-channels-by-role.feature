Feature: Access organization channels by role
	An organization member needs to be able to view or edit the organization's channels according to their organization role, without being invited to each channel

	Background:
		Given I am signed in to Studio
			And there is an organization with a channel
			And I am not a direct editor or viewer of the channel

	Scenario Outline: Organization admins and editors can edit organization channels
		Given I am an active <role> of the organization
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
		Given I am an active viewer of the organization
		When I open the channel from the *Channels* tab of the organization
		Then I can view the channel's resources, exercises and files
			And I do not see the options to add, edit, move or delete resources

	Scenario: Inactive members cannot access organization channels
		Given I was an active member of the organization and I have been removed from it
		When I try to open the channel
		Then I cannot see the channel or its resources

	Scenario: Filter *My channels* by organization
		Given I am an active editor of the organization
			And I am a direct editor of a channel that is not part of the organization
			And I am at *My channels*
		When I select the organization in the *Filter by organization* drop-down
		Then I see only the channels that are part of the organization
			And the selected organization is kept in the page URL
		When I reload the page
		Then I still see only the channels that are part of the organization
		When I select *All organizations* in the *Filter by organization* drop-down
		Then I see all the channels I can edit
