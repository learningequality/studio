Feature: Go back from Review selections for import to channel list

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on *My Channels > edit* page

	Scenario: Go back from Review selections for import to channel list
		When I click the *Add* button
			And I select the *Import from Channels* option
		Then I see the *Import from Other Channels* page
		When I select a <resource> from the public channels
			And I click the *Review* button
		Then I see the *Review selections for import* modal
		When I click the *Back* link
		Then I see *Import from Other Channels* page again
			And I see the *0 topics, 0 resource* at the bottom of the modal

	Examples:
	| resource |