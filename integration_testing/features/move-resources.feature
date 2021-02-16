Feature: Move resources to a new destination

	Background:
		Given I am signed in to Studio as a non-admin user
			And I select some resources on the channel editor
		Then I see a move button appears in the actions bar

	Scenario: Move resources into a new destination
		When I click on a checkbox(s) and make a resource selection
			And I click the move button
		Then I am navigated to a screen that allows me to navigate and choose a destination to move the resource
		When I navigate to an appropriate destination
			And click the *Move here* button 
		Then I am redirected to the channel editor
			And I see a snackbar confirmation that my resources are moved
			And the resources are no longer in my original directory