Feature: Undo removal of multiple selections

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Undo removal of multiple selections
		When I have removed several items from the clipboard
			And I see the snackbar confirmation that the items were removed
			And I click the *Undo* text on the snackbar
		Then I see the items are back to the clipboard