Feature: Administration - Review contested channel migrations
	A Kolibri Studio administrator needs to be able to approve or decline requests to move channels into organizations that could not be done automatically

	Background:
		Given Kolibri Studio is accessible at https://studio.learningequality.org/ or any of the test environments
			And I am signed in as an administrator user
			And I am at *Administration > Migrations*

	Scenario: See the contested migrations
		Given there are pending migration requests
		When I look at the *Administration > Migrations* page
		Then I see the *Contested migrations* heading
			And I see an *N contested migrations* label with the number of pending requests
			And I see the following table columns: Channel, Organization, Requestor, Options

	Scenario: No contested migrations
		Given there are no pending migration requests
		When I look at the *Administration > Migrations* page
		Then I see the message *No contested migrations*

	Scenario: Accept a migration request
		Given there is a pending migration request for <channel>
		When I click the *Options* button for the request
			And I select *Accept*
		Then I see the message *Migration for <channel> accepted.*
			And I no longer see the request in the table
			And <channel> appears in the *Channels* tab of the requested organization
			And the requestor no longer sees the request as awaiting review

	Scenario: Decline a migration request
		Given there is a pending migration request for <channel>
		When I click the *Options* button for the request
			And I select *Decline*
		Then I see the message *Migration for <channel> declined.*
			And I no longer see the request in the table
			And <channel> keeps its previous organization
			And the requestor can select an organization for <channel> again

	Scenario: Regular users cannot review migrations
		Given I am signed in as a user who is not a Studio administrator
		When I try to open *Administration > Migrations*
		Then I cannot see or resolve any migration requests
