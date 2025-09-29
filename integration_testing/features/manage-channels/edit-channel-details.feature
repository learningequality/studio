Feature: Edit channel details

	Background:
		Given I am signed in to Studio
			And I am on the channel editor view

		Scenario: Edit channel details
			When I click the pencil icon next to the channel name
			Then I see a modal window with the channel details
				And I see the details for the channel - channel name, language, channel description etc.
			When I modify any of the details
				And I click the *Save changes* button
			Then I see *Changes saved* snackbar message
				And I can close the modal window
