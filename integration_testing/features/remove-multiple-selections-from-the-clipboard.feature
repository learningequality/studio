Feature: Remove multiple selections from the clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Remove multiple selections from the clipboard
		When I select multiple item checkboxes
			And I click the remove icon in the actions bar
		Then I see all my selections removed from the clipboard
			And I see a snackbar confirming that the items were removed