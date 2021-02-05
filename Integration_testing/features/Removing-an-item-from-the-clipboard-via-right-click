Feature: Removing an item from the clipboard via right click

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Removing an item from the clipboard via right click
		When I right click a topic or a resource
			And I click 'Delete' in the dropdown menu that appears
		Then the dropdown menu should disappear
			And I should see that the item in question should disappear from the clipboard