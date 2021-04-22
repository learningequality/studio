Feature: Edit channel details 

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on *My Channels* tab

		Scenario: Edit channel details
			When I click the *...* (Options) button for the desired channel
				And I click the *Edit channel details* option
			Then I see a new page with the channel details
				And I see the details for the channel - channel name, language, channel description etc.
			When I modify any of the details
				And I click the *Save changes* button
			Then I see a message: Changes saved
				And I can close the page

