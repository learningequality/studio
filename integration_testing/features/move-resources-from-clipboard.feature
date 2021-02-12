Feature: Move multiple resources frm Clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard button on the bottom-right of the screen
			And the clipboard opens up
	
	Scenario: Move multiple resources
		When I select multiple items via checkboxes
			And I see that the select bar changes to an actions bar
			And I click the move button in the actions bar
		Then I am redirected to the movement interface where I can choose a new directory or channel to move the items to