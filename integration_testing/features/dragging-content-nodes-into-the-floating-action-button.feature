Feature: Dragging content nodes into the floating action button

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
		And the clipboard opens up

	Scenario: Dragging content nodes into the floating action button
		When the clipboard is closed and the interface shows the clipboard FAB (floating-action-button)
			And I begin to drag items from the channel editor toward the FAB
		Then I should see the FAB change color styling and move slightly up and down
		When I drop the content into the FAB
		Then the FAB styling should go back to normal
			And I should see a snackbar appear confirming the items were moved to clipboard