Feature: Preview an item in the clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Preview an item in the clipboard
		When I click on a topic title or resource title
		Then I see the clipboard content transition to the preview panel