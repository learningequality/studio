Feature: Move multiple selections

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up
	
	Scenario: Move multiple selections
		When I select multiple items via checkboxes
			And I see that the select bar changes to an actions bar
			And I click the move icon in the actions bar
		Then I am redirected to the movement interface where I can choose a new directory or channel to move the items to