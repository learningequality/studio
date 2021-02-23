Feature: Request more storage space

	Background:
		Given I am signed in to Studio as a non-admin user 
			And I am on Studio *Settings > Storage* page
			And I click *Show form* on the page

	Scenario: Submit more space request
		When I fill in all the space request text fields
			And I click the *Send request* submit button
		Then I see all the text fields clear
			And a snackbar appears to confirm the submission

	Scenario: Submit more space request with errors
		When I do not fill in all the required text fields
			And I click the *Send request* submit button
		Then I see a system error message above the form
			And I see my text field inputs still intact
			And I see error validation text near fields that need input