Feature: Share channels
	A user needs to be able to invite collaborators to edit or view channels

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page

	Scenario: Invite collaborators with *Can edit* permissions
		When I click the *Share* button
			And select the *Invite collaborators* option #alternatively I can click the *...* (options) button in the top toolbar and select the *Share channel* option
		Then I am at the *Sharing* tab for the channel
		When I type the email of the person I want to invite
			And I leave the default *Can edit* option in the drop-down
			And I click the *Send invitation* button
		Then the collaborator will be notified on their *My Channels* page, where they can accept or reject the pending invitation
			And the collaborator will receive an email allowing them to accept/reject the pending invitation

	Scenario: Invite collaborators with *Can view* permissions
		Given I am at the *Sharing* tab for the channel
		When I type the email of the person I want to invite
			And I select the *Can view* option in the drop-down
			And I click the *Send invitation* button
		Then the collaborator will be notified on their *My Channels* page, where they can accept or reject the pending invitation
			And the collaborator will receive an email allowing them to accept/reject the pending invitation
