Feature: Expand and collapse topics in the clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Expand and collapse topics in the clipboard
		When I expand a topic on the clipboard via the downward carot icon
		Then I see the items within the topic appear 
			And I see the downward carot icon changes to an upward carot icon
		When I collapse a topic on the clipboard via the upward carot icon
		Then I see the items within that topic disappear
			And I see the upward carot icon changes to an upward carot icon