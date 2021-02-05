Feature: Dragging content nodes out of the clipboard

	Background:
		Given I am signed into Kolibri Studio as an admin user
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Dragging content nodes out of the clipboard
		When the clipboard is open and I begin to drag items out of the clipboard
			And I drop the items on the channel editor
		Then clipboard should stay open
			And the items should disappear from the clipboard
			And I should see the items appear on the channel editor node at the very bottom