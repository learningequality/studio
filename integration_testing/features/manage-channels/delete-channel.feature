Feature: Delete a channel

	Background:
		Given I am signed in to Studio
			And I have permissions to edit a channel
			And I am at *My channels* tab

	Scenario: Delete a channel
		When I click the *Options* button of a channel #the three dots to the right
		Then I see a *Delete channel* option
		When I click the *Delete channel* option
		Then I see a *Delete this channel* confirmation modal
		When I click the *Delete channel* button
		Then I see a *Channel deleted* snackbar message
			And the deleted channel is no longer displayed on *My channels* tab

	Scenario: Cancel the deletion of a channel
		When I click the *Options* button of a channel #the three dots to the right
		Then I see a *Delete channel* option
		When I click the *Delete channel* option
		Then I see a *Delete this channel* confirmation modal
		When I click the *Cancel* button
		Then the *Delete this channel* modal window is closed
			And the channel is not deleted

	Scenario: Delete a channel while viewing the contents of a channel
		When I click on the channel name
		Then I see the channel resources page
		When I click the *Options* button to the right side of the topbar
		Then I see a *Delete channel* option colored in red
		When I click the *Delete this channel* option
			And I click the *Delete channel* button
		Then I am brought back to *My channels* tab
			And I see a *Channel deleted* snackbar message
			And the deleted channel is no longer displayed in *My channels* list
