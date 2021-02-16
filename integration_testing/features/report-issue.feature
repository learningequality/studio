Feature: Report an issue

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the *Settings > About Studio* page

	Scenario: Report an issue
		When I click the *Report an issue* button
		Then I see a dialog modal appears
			And I see text input fields
		When I input issue information
			And click the *Submit* button
		Then I see the modal disappears
			And a snackbar appears to confirm the submission

	Scenario: Error in issue report submission
		When I input some issue information
			And skip at least one field
		Then I see error validation text beneath the error fields
		When I resolve those errors
			And click the *Submit* button
		Then I see the modal disappears
			And a snackbar appears to confirm the submission