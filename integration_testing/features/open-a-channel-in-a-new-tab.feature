Feature: Open channel in new tab

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the channel editor view

	Scenario: Open channel in new tab
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I right click a channel item on the clipboard
			And click *Open in new tab* on the dropdown menu that appears
		Then a tab opens with the view-only or editable channel in question