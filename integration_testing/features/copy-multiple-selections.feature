Feature: Copy multiple selections

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens ups

	Scenario: Copy multiple selections
		When I select multiple items via checkboxes
			And I see that the select bar has changed to an actions bar
			And I click the copy icon in the actions bar
		Then I see a snackbar appears with a *Creating copies* message
		When the copy creation process is finished
		Then the *Creating copies* snackbar disappears
			And a snackbar *Copies created* appears
			And I see that copies are created in my clipboard