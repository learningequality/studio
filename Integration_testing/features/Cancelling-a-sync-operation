Feature:

	Background: Cancelling a sync operation
		Given I have made syncing parameter selections
			And my sync task is in-progress

	Scenario: Cancelling a sync operation
		When I click the 'Stop sync' button
		Then I see a warning dialog appear
		When I press 'yes, stop task' button
		Then the sync task stops
			And I see a snackbar confirming the task stopped
			And I am back in the channel editor