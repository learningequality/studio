Feature: Drag-drop resources out of the clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Drag-drop content nodes out of the clipboard
		When the clipboard is open and I begin to drag items out of the clipboard
			And I drop the items on the channel editor
		Then clipboard stays open
			And the items disappear from the clipboard
			And I see the items appear on the channel editor node at the very bottom