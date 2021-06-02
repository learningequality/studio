Feature: Access and use additional options on channel list
	User needs to be able to access additional options to manage channels from the channel list

	Background: 
		Given I am signed in to Studio
			And I am at *My Channels* tab

	Scenario: Edit channel details
		When I click the *⋮* button
			And I click the *Edit channel details* option
		Then I see a modal window with the channel details
			And I see the details for the channel - channel name, language, channel description etc.
		When I modify any of the details
			And I click the *Save changes* button
		Then I see a message: Changes saved
			And I can close the modal window

	Scenario: Copy channel token
		When I click the *⋮* button
			And I click the *Copy channel token* option
		Then I see the *Copy channel token* modal window
		When I click on the icon to the right of the token
		Then I see a *Token copied* message
			And I can paste the copied token wherever I need to paste it

	Scenario: Delete channel
		When I click the *⋮* button
			And I click the *Delete channel* option
		Then I see the *Delete this channel* modal window
			And I see a message *This channel will be permanently deleted. This cannot be undone.*
		When I click the *Delete channel* button
		Then the channel is deleted and is no longer displayed

	Scenario: View channel details
		When I click the *i* button
		Then I see a modal window with the channel details
		When I click the *Download channel summary button*
			And I click one of the available options
		Then I can download the channel summary either as a .pdf or a .csv file
