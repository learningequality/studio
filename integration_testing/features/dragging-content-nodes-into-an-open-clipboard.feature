Feature: Dragging content nodes into an open clipboard

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Dragging content nodes into an open clipboard
		When the clipboard is open
			And I begin to drag items from the channel editor into the open clipboard
		Then I should see the clipboard show a thick border and turn opaque to indicate this is a draggable area
		When I drop the content into the clipboard
		Then the opaque area should disappear
			And I should see the clipboard be updated to reflect the newly dragged items