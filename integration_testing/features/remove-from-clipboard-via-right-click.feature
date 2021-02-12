Feature: Remove resource from the clipboard via right click

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Remove resource from the clipboard via right click
		When I right click a topic or a resource
			And I click *Delete* in the dropdown menu that appears
		Then the dropdown menu disappears
			And I see that the resource in question is removed from the clipboard