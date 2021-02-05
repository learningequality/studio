Feature: Stopping the publishing of a channel

	Background: 
		Given that a channel publishing task is in-progress

	Scenario: Stopping the publishing of a channel
		When I click the "Stop" button in the publish modal
		Then a confirmation message appears
		When I click "Yes, stop task"
		Then the publish task stops
			And I am back in the channel editor page