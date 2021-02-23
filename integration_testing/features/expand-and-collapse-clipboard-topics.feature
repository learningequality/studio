Feature: Expand and collapse topics in the clipboard

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the channel editor view

	Scenario: Expand and collapse topics in the clipboard
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I expand a topic on the clipboard via the downward carot button
		Then I see the items within the topic appear 
			And I see the downward carot button changes to an upward carot button
		When I collapse a topic on the clipboard via the upward carot button
		Then I see the items within that topic disappear
			And I see the upward carot button changes to an upward carot button