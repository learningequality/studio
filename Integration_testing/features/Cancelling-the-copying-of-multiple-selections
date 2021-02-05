Feature: Cancelling the copying of multiple selections

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Cancelling the copying of multiple selections
		When there is a copy creation of multiple selections in progress
			And I click on the 'cancel' text on the snackbar
		Then the operation should cease and the snackbar should disappear
			And I should not see any copies made on the clipboard