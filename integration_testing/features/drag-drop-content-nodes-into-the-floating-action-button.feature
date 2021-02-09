Feature: Drag-drop content nodes into the floating action button

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
		And the clipboard opens up

	Scenario: Drag-drop content nodes into the floating action button
		When the clipboard is closed and the interface shows the clipboard FAB (floating-action-button)
			And I begin to drag items from the channel editor toward the FAB
		Then I see the FAB changes color styling and move slightly up and down
		When I drop the content into the FAB
		Then the FAB styling gets back to normal
			And I see a snackbar appears to confirm the items were moved to clipboard