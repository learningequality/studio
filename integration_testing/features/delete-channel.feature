Feature: Delete channel 

	Background: 
		Given I am signed in to Studio
			And I am on *My Channels* tab

	Scenario: Delete channel
		When I click the *Options* button of a channel #the three dots to the right
		Then I see a *Delete channel* option
		When I click the *Delete channel* option
			And I click the *Delete channel* button
		Then I see a message that the channel is deleted
			And the channel is no longer displayed on *My Channels* tab