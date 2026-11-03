Feature: Move a channel to an organization
	A channel editor needs to be able to move a channel into an organization, and to request approval from Studio administrators when not every channel editor is already a member of that organization

	Background:
		Given I am signed in to Studio
			And I am an editor of a channel that is not part of an organization
			And I am an active editor or admin of an organization
			And I am at the channel details

	Scenario: Only organizations I can edit are offered
		Given I am an active viewer of another organization
		When I open the *Channel organization* drop-down
		Then I see the organizations where I am an active editor or admin
			And I do not see the organizations where I am only a viewer

	Scenario: Move a channel when every channel editor is in the organization
		Given every editor of the channel is an active editor or admin of the organization
		When I select the organization in the *Channel organization* drop-down
			And I save the channel organization
		Then I see the *Channel organization saved.* message
		When I reload the page
		Then I still see the organization in the *Channel organization* drop-down
			And I see the channel in the *Channels* tab of the organization

	Scenario: Request approval when a channel editor is not in the organization
		Given another editor of the channel is not an active editor or admin of the organization
		When I select the organization in the *Channel organization* drop-down
		Then I see the message *Migration cannot be done automatically. Create a ticket with website administrators below.*
			And I see the *Create ticket* button
		When I click the *Create ticket* button
		Then I see the message *Migration to <organization> is awaiting review.*
			And I cannot change the channel organization
			And the request does not appear as a channel sharing invitation

	Scenario: Decline my own pending migration request
		Given I have created a migration ticket for the channel
		When I click the *Decline* button next to the pending migration
		Then I see the message *Migration request declined.*
			And I can select an organization in the *Channel organization* drop-down again

	Scenario: Website administrators can move any channel without approval
		Given I am a Studio administrator
			And I am at the details of a channel in *Administration > Channels*
		When I select an organization in the *Channel organization* drop-down
			And I click the *Save organization* button
		Then I see the *Channel organization saved.* message
