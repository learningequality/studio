Feature: Cancel sync

	Background:
		Given I have made sync parameter selections
			And the sync task is in-progress

	Scenario: Cancel sync
		When I click the *Stop sync* button
		Then I see a warning dialog appear
		When I press *Yes, stop task* button
		Then the sync task stops
			And I see a snackbar confirmation for task stopped
			And I am back in the channel editor

	Scenario: Finish the sync operation
		When the sync progress bar finishes
		Then the progress dialog disappears
			And I am back in the channel editor page
			And a snackbar appears to confirm the sync completion