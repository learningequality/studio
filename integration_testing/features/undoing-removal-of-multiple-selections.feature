Feature: Undoing removal of multiple selections

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Undoing removal of multiple selections
		When I have removed several items from the clipboard
			And I see the snackbar confirming the items were removed
			And I press the 'undo' text on the snackbar
		Then I should see the items back on the clipboard