Feature: Drag-drop resources out of the clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view

	Scenario: Drag-drop content nodes out of the clipboard
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I start dragging resources out of the clipboard
			And I drop the resources in the channel editor
		Then the clipboard remains open
			And I see the dragged resources in the channel editor
