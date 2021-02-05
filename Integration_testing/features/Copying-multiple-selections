Feature: Copying multiple selections

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Copying multiple selections
		When I select multiple items via checkboxes
			And I see that the select bar has changed to an actions bar
			And I click the copy icon in the actions bar
		Then I should see a snackbar appear stating 'Creating copies'
		When the copy creation process is finished
		Then the 'creating copies' snackbar should disappear
			And a snackbar stating 'Copies created' should appear
			And I should see that copies were created in my clipboard