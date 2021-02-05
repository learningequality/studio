Feature: Jump to the new location

	Background:
		Given I finished moving selections into a new directory
			And I am on the channel edit page
			And a snackbar appeared confirming the move was successful
			And there is a "Go to location" action text on the snackbar

	Scenario: Jump to the new location
		When I click the 'Go to location' action
		Then I jump to the new location the resources were moved to