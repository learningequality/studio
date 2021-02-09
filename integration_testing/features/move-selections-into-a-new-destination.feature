Feature: Move selections into a new destination

	Background:
		Given I am signed in to Studio
			And I make some content selections on the channel editor
		Then I see a move icon appears in the actions bar

	Scenario: Move selections into a new destination
		When I click on a checkbox(s) and make a content selection
			And I press the move icon
		Then I am navigated to a screen that allows me to navigate and choose a destination to move the content
		When I navigate to an appropriate destination
			And click the *Move here* button 
		Then I am redirected to the channel editor
			And I see a snackbar confirmation that my selections are moved
			And the selections are no longer in my original directory