Feature: Drag-drop resources out of the clipboard

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the channel editor view

	Scenario: Drag-drop content nodes out of the clipboard
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I begin to drag items out of the clipboard
			And I drop the items on the channel editor
		Then clipboard stays open
			And the items disappear from the clipboard
			And I see the items appear on the channel editor node at the very bottom