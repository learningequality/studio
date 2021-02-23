Feature: Stop the publish of a channel

	Background: 
		Given there's a channel publish task in-progress

	Scenario: Stop the publish of a channel
		When I click the *Stop* button in the publish modal
		Then a confirmation message appears
		When I click *Yes, stop task*
		Then the publish task stops
			And I am back in the channel editor page