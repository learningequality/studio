Feature: Making and confirming selections to sync

	Background:
		Given I am in the channel editor page
		When I click on the ellipsis icon in the top-right corner
			And I click on the 'Sync channel' menu option
		Then a 'Sync resources' modal appears

	Scenario: Making and confirming selections to sync
		When I make sync selections via the checkboxes
			And click the 'continue' button
		Then a modal appears confirming my sync choices
		When I click 'Sync'
		Then a progress bar appears