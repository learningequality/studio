Feature: Move resource in the clipboard via right click

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the channel editor view

	Scenario: Move an item in the clipboard via right click
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I right click a topic or resource in the clipboard
			And click *Move to...* in the dropdown menu that appears
		Then I am redirected to the movement interface where I can choose a new directory or channel to move the items to