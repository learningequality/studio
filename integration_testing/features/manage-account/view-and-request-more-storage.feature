Feature: View the storage and request more storage space

	Background:
		Given I am signed in to Studio
			And I am at the *Settings > Storage* page
			And I have uploaded some resources to my channels

	Scenario: Review used storage
		When I look at the *Settings > Storage* page
		Then I see the *% storage used* progress bar
			And I see the remaining storage as *NNN MB of NNN MB*
			And I see the amount of storage used broken down by resources type

	Scenario: No storage used
		Given that I have not uploaded any resources in my channels
		When I look under the *% storage used* heading
		Then I see that there is 0% storage used

	Scenario: Request more space
		When I click the *Open form* link under the *Request more space* section
			And I fill in all the space request required fields
			And I click the *Send request* button
		Then the form disappears
			And I see a *Your storage request has been submitted for processing* snackbar message
		When after a period of time I open my email
		Then I see a *Kolibri Studio storage request from user@user.com* email

	Scenario: Submit more space request with errors
		When I leave the required fields empty
			And I click the *Send request* button
		Then I see a *Please fix N errors below* error message above the form
			And I see a *Field is required* text below each required field
