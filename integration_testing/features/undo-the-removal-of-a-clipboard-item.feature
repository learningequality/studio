Feature: Undoing the removal of a clipboard item

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Undoing the removal of a clipboard item
		When I have removed an item from the clipboard
			And I see a snackbar confirming the items were removed
			And I press the 'undo' text on the snackbar
		Then I should see the item back on the clipboard