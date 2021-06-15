Feature: Create a topic

	Background:
		Given I am signed in to Studio
			And I am on the channel editor page

	Scenario: Create a topic
		When I click the *Add* button in the top right corner
			And I click the *New topic* option
		Then I see the *New topic* modal
		When I fill in the required field *Title*
			And I fill in any of the other fields such as *Description*, *Tags* and *Language*
			And I add a thumbnail image
			And I click the *Finish* button
		Then I am on the channel editor page
			And I can see the newly created topic
