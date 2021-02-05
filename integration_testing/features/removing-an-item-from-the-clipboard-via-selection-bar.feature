Feature: Removing an item from the clipboard via selection bar

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Removing an item from the clipboard via selection bar
		When I select a topic or resource via its checkbox
			And I see that the top bar has changed to an actions bar
			And I click the "Delete" icon in the actions bar
		Then I should see that the item in question should disappear from the clipboard
			And I should see a snackbar appear confirming the item was removed