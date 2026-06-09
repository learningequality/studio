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

	Scenario: Upgrade storage
		When I look at the *Settings > Storage* page
		Then I see the *Upgrade storage now* form
			And I see a *Purchase additional storage at $15/GB per year* text
			And I see a *Storage (GB)* field with default value of 10
			And I see an enabled *Upgrade now* button
		When I enter a value in the *Storage (GB)* field
		Then I see that the price per year value is updated correctly
		When I click the *Upgrade now* button
		Then I am redirected to an external checkout page
		When I complete the checkout with test card 4242 4242 4242 4242
			And I go back to *Settings > Storage*
		Then I see that the size of my storage is increased with the value of the purchased storage
			And I see an info text *Storage subscription active*
			And I see additional info about the size of storage included in my subscription and when it will renew automatically
			And I see a *Manage subscription* link

	Scenario: Cancel an active storage subscription
		Given I have an active storage subscription
		When I click the *Manage subscription* link
		Then I see a page with all the details of my current subscription
			And I see a *Cancel subscription* button
		When I click the *Cancel subscription* button
			And I confirm the cancellation
		Then I am brought back to the *Settings > Storage* page
			And I see a confirmation that the subscription is cancelled
			And I see a message indicating when the subscription will expire and that the storage will be removed after that

	Scenario: Reactivate a cancelled storage subscription
		Given I have cancelled my storage subscription
		When I click the *Manage subscription* link
		Then I see a page with all the details of my current subscription
			And I see a *Don't cancel subscription* button
		When I click the *Don't cancel subscription* button
			And I renew the subscription
		Then when I go back to the *Settings > Storage* page I see again the info text *Storage subscription active*
			And I see additional info about the size of storage included in my subscription and when it will renew automatically
			And I see a *Manage subscription* link

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
