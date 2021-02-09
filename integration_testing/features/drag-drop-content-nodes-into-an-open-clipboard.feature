Feature: Drag-drop content nodes into an open clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Drag-drop content nodes into an open clipboard
		When the clipboard is open
			And I begin to drag items from the channel editor into the open clipboard
		Then I see the clipboard shows a thick border and turns opaque to indicate this is a draggable area
		When I drop the content into the clipboard
		Then the opaque area disappears
			And I see the clipboard updated to reflect the newly dragged items