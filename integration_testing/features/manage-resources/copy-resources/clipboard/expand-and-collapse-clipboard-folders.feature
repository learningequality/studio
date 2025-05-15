Feature: Expand and collapse folders in the clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view

	Scenario: Expand and collapse folders in the clipboard
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I expand a folder on the clipboard via the downward arrow button
		Then I see the items within the folder appear
			And I see the downward arrow button changes to an upward arrow button
		When I collapse a folder on the clipboard via the upward arrow button
		Then I see the items within that folder disappear
			And I see the upward arrow button changes to an upward arrow button
