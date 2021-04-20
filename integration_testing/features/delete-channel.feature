Feature: Delete channel 

	Background: 
		Given I am signed in to Studio
			And I have permissions to edit
			And I am on *My Channels* tab

	Scenario: Delete channel
		When I click the *Options* button of a channel #the three dots to the right
		Then I see a *Delete channel* option
		When I click the *Delete channel* option
			And I click the *Delete channel* button
		Then I see a message that the channel is deleted
			And the deleted channel is no longer displayed on *My Channels* tab

	Scenario: Cancel deleting a channel
		When I click the *Options* button of a channel #the three dots to the right
		Then I see a *Delete channel* option
		When I click the *Delete channel* option
			And I click the *Cancel* button
		Then the *Delete this channel* modal window is closed
			And the channel is not deleted

	Scenario: Delete a channel while viewing the contents of a channel
		When I click on the channel name
		Then I see the channel resources page
		When I click the *Options* button to the right side of the topbar
		Then I see a *Delete channel* option colored in red
		When I click the *Delete channel* option
			And I click the *Delete channel* button
		Then I see a message that the channel is deleted
			And I am brought back on *My channels* tab
			And the deleted channel is no longer displayed on *My Channels* tab