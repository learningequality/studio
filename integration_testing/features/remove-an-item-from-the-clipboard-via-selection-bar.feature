Feature: Remove an item from the clipboard via selection bar

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Remove an item from the clipboard via selection bar
		When I select a topic or resource via its checkbox
			And I see that the top bar changes to an actions bar
			And I click the *Delete* icon in the actions bar
		Then I see that the item in question disappears from the clipboard
			And I see a snackbar appears to confirm the item is removed