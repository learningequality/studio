Feature: Move multiple resources from Clipboard

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the channel editor view
	
	Scenario: Move multiple resources
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I select multiple items via checkboxes
			And I see that the select bar changes to an actions bar
			And I click the move button in the actions bar
		Then I am redirected to the movement interface where I can choose a new directory or channel to move the items to