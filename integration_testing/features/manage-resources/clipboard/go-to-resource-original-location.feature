Feature: Go to resource original location

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view

	Scenario: Go to resource original location
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I right click a topic or resource in the clipboard
			And I click *Go to original location*
		Then a new tab opens and navigates me to the channel and node location in question that I pulled that topic or resource from
