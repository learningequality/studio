Feature: Making a copy of an item via selection bar

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Making a copy of an item via selection bar
		When I select a topic or resource via its checkbox
			And I see that the top bar has changed to an actions bar
			And I click copy icon in the actions bar
		Then I should see a 'Copying' loader appear confirming to me that Kolibri Studio is working on making a copy
		When the copy creation is finished
		Then the 'Copying' loader should disappear
			And I should see another snackbar appear confirming 'Copy created'
			And I should see the newly made copy appear in the clipboard below the original