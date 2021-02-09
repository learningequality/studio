Feature: Cancel a sync operation

	Background:
		Given I have made sync parameter selections
			And my sync task is in-progress

	Scenario: Cancel a sync operation
		When I click the *Stop sync* button
		Then I see a warning dialog appear
		When I press *Yes, stop task* button
		Then the sync task stops
			And I see a snackbar confirmation for task stopped
			And I am back in the channel editor