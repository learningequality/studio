Feature: Move resources to a new destination

	Background:
		Given I am signed in to Studio
			And I've selected some resources in the channel editor
			And I see the *Move* button in the actions bar

	Scenario: Move resources into a new destination
		When I click the *Move* button
		Then I am navigated to a screen that allows me to navigate and choose a destination to move the resource
		When I navigate to an appropriate destination
			And click the *Move here* button
		Then I am redirected back to the channel editor
			And I see a snackbar confirmation that my resources are moved
			And the resources are no longer in my original directory

	Scenario: Go to the new location
		Given I've successfully moved a resource
		When I click the *Go to location* button from the snackbar message
		Then I'm at the new resource location
			And I can see the moved resource
