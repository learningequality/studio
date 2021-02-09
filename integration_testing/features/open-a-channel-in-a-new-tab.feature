Feature: Open a channel in a new tab

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Open a channel in a new tab
		When I right click a channel item on the clipboard
			And click *Open in new tab* on the dropdown menu that appears
		Then a tab opens with the view-only or editable channel in question