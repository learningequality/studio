Feature: Preview resource in the clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view

	Scenario: Preview resource in the clipboard
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I click on a topic title or resource title
		Then I see the clipboard content transition to the preview panel
