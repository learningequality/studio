Feature: Moving multiple selections

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up
	
	Scenario: Moving multiple selections
		When I select multiple items via checkboxes
			And I see that the select bar has changed to an actions bar
			And I click the move icon in the actions bar
		Then I should be redirected to the movement interface where I can choose a new directory or channel to move the items to