Feature: Drag-drop to clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view

	Scenario: Drag-drop resources to an open clipboard
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When the clipboard is open
			And I begin to drag resources from the channel editor into the open clipboard
		Then the clipboard changes color to indicate that this is an area where the selected resource can be dropped
		When I drop the resource into the clipboard
		Then I see the clipboard updated to reflect the newly dragged resources

	Scenario: Drag-drop resources to the clipboard button
		When the clipboard is closed and the interface shows the clipboard button
			And I begin to drag resources from the channel editor toward the clipboard button
		Then I see the clipboard button changes color styling and move slightly up and down
		When I drop the content into the clipboard button
		Then the clipboard button styling gets back to normal
			And I see a snackbar appears to confirm the resources were moved to clipboard
