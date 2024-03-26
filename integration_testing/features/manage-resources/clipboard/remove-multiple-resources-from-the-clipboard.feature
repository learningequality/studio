Feature: Remove multiple resources from the clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view

	Scenario: Remove multiple resources from the clipboard
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I select multiple resource checkboxes
			And I click the remove button in the actions bar
		Then I see all my resources removed from the clipboard
			And I see a snackbar confirming that the resources were removed
