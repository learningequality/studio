Feature: Expanding and collapsing topics in the clipboard

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Expanding and collapsing topics in the clipboard
		When I expand a topic on the clipboard via the downward carot icon
		Then I should see the items within the topic appear 
			And I should see the downward carot icon change to an upward carot icon
		When I collapse a topic on the clipboard via the upward carot icon
		Then I should see the items within that topic disappear
			And I should see the upward carot icon  change to an upward carot icon