Feature: Moving selections into a new destination

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I make some content selections on the channel editor
		Then I should see a move icon appear in the actions bar

	Scenario: Moving selections into a new destination
		When I click on a checkbox(s) and make a content selection
			And I press the move icon
		Then I should be navigated to a screen that allows me to navigate and choose a destination to move the content
		When I navigate to an appopriate destination
			And click the 'move here' button 
		Then I should be redirected to the channel editor
			And I should see a snackbar confirming my selections were moved
			And the selections should no longer be in my original directory