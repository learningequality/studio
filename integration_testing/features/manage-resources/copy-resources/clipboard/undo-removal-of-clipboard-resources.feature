Feature: Undo the removal of a clipboard resources

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view

	Scenario: Undo the removal of a clipboard resource
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I have removed a resource from the clipboard
			And I see a snackbar confirming the resource is removed
			And I click the *Undo* button on the snackbar
		Then I see the resource back on the clipboard

	Scenario: Undo removal of multiple resources
		When I have removed several resources from the clipboard
			And I see the snackbar confirmation that the resources were removed
			And I click the *Undo* button on the snackbar
		Then I see the resources are back to the clipboard
