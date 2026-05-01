Feature: View and edit the account information

	Background:
		Given I am signed in to Studio
			And I am at the *Settings > Account* page

	Scenario: View the account information
		When I look at the page
		Then I see the *Basic information* section with, *Username*, *Full name* and *Password*
			And I see the *API token* section with the token
			And I see the *Export account data* section with *Export data* button
			And I see the *Delete account* section

	Scenario: Edit the full name
		When I click the *Edit full name* link next to my username
		Then I see the *Edit full name* modal
		When I make changes to my full name
			And I click the *Save changes* button
		Then the modal closes
			And I see a *Changes saved* snackbar

	Scenario: Change the password
		When I click on the *Change password* link
		Then I see the *Change password* modal
		When I enter a new password
			And I click the *Save changes* button
		Then the modal closes
			And I see a *Changes saved* snackbar

	Scenario: Copy the API token
		When I click the copy button in the token text field
		Then I see a *Token copied* snackbar

	Scenario: Export account data
		When I click the *Export data* button
		Then I see the *Data export started* modal
		When I click the *OK* button
		Then the modal closes

	Scenario: View the exported data
		When after a period of time I check the Inbox of my email account registered at Studio
		Then I see an email with the exported account data as an attachment
			And I can view the exported account data
