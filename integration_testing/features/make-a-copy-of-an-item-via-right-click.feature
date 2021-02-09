Feature: Make a copy of an item via right click
	
	Background:
		Given I am signed in to Studio
			And I am on the channel editor view
		Then I click on clipboard floating action button on the bottom-right of the screen
			And the clipboard opens up

	Scenario: Make a copy of an item via right click
		When I right click a topic or a resource
			And I click *Make a copy* in the dropdown menu that appears
		Then I see a *Creating copy* snackbar appears to confirm the copy is in progress
		When the copy creation is finished
		Then the *Creating copy* snackbar disappears
			And I see another snackbar appears to confirm *Copy created*
			And I see the newly made copy appearss in the clipboard below the original