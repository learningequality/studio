Feature: Copy resource via selection bar

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the channel editor view

	Scenario: Copy resource via selection bar
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I select a topic or resource via its checkbox
			And I see that the top bar changes to an actions bar
			And I click copy icon in the actions bar
		Then I see a *Copying* loader appears to confirm the copy in progress
		When the copy creation is finished
		Then the *Copying* loader disappears
			And I see another snackbar appears to confirm *Copy created*
			And I see the newly made copy appears in the clipboard below the original