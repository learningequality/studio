Feature: Movе an item in the clipboard via right click

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Movе an item in the clipboard via right click
		When I right click a topic or resource in the clipboard
			And click *Move to...* in the dropdown menu that appears
		Then I am redirected to the movement interface where I can choose a new directory or channel to move the items to