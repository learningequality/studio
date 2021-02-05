Feature: Request more storage space

	Background: 
		Given I am on Studio *Settings* page
			And I am on the *Storage* tab
			And I click *Show form* on the page

	Scenario: Submitting more space request
		When I fill in all the space request text fields
			And I click the *Send request* submit button
		Then I see all the text fields clear
			And a snackbar appears confirming the submission

	Scenario: Submitting more space request with errors
		When I do not fill in all the required text fields
			And I click the *Send request* submit button
		Then I see a system error message above the form
			And I see my text field inputs still intact
			And I see error validation text near fields that need input