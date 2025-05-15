Feature: Remove resource from the clipboard via selection bar

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view

	Scenario: Remove resource from the clipboard via selection bar
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I select a topic or resource via its checkbox
			And I see that the top bar changes to an actions bar
			And I click the *Delete* button in the actions bar
		Then I see that the resource in question disappears from the clipboard
			And I see a snackbar appears to confirm the resource is removed
