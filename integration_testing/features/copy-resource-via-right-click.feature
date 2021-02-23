Feature: Copy resource via right click
	
	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the channel editor view

	Scenario: Copy resource via right click
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I right click a topic or a resource
			And I click *Make a copy* in the dropdown menu that appears
		Then I see a *Creating copy* snackbar appears to confirm the copy is in progress
		When the copy creation is finished
		Then the *Creating copy* snackbar disappears
			And I see another snackbar appears to confirm *Copy created*
			And I see the newly made copy appearss in the clipboard below the original