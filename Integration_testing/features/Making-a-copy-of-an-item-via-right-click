Feature: Making a copy of an item via right click
	
	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Making a copy of an item via right click
		When I right click a topic or a resource
			And I click 'Make a copy' in the dropdown menu that appears
		Then I should see a 'creating copy' snackbar appear confirming to me that Kolibri Studio is working on making a copy
		When the copy creation is finished
		Then the 'creating copy' snackbar should disappear
			And I should see another snackbar appear confirming 'Copy created'
			And I should see the newly made copy appear in the clipboard below the original