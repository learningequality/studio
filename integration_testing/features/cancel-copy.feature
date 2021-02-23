Feature: Cancel copy
	
	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the channel editor view

	Scenario: Cancel copy of single resource
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When the copy creation is in-progress
			And I click on *Undo* text on the snackbar
		Then the operation ceases and the snackbar disappears
			And I don't see any copies made on the clipboard

	Scenario: Cancel copy of multiple resources
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When there is a copy creation of multiple selections in progress
			And I click on the *Cancel* text on the snackbar
		Then the operation ceases and the snackbar disappears
			And I don't see any copies made on the clipboard