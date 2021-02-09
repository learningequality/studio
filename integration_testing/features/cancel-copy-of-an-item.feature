Feature: Cancel the copy of an item
	
	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Cancel the copy of an item	
		When the copy creation is in-progress
			And I click on *Undo* text on the snackbar
		Then the operation ceases and the snackbar disappears
			And I don't see any copies made on the clipboard