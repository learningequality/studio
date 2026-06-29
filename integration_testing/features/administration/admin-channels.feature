Feature: Administration - Manage channels
  A Kolibri Studio administrator should be able to view and manage channels related data

  Background:
    Given Kolibri Studio is accessible at https://studio.learningequality.org/ or any of the test environments
    	And I am signed in as an administrator user
    	And I am at *Administration > Channels*

  Scenario: View the *All channels* table
		When I look at the *Administration > Channels* page
		Then I see the table with all of the available channels
			And I see an *N channels* label with the total number of created channels
			And I see a *Channel type* filter with *All channels* set as the default value
			And I see a *Channel status* filter with *Live* set as the default value
			And I see a *Language* filter with no selected value
			And I see a *Search for a channel...* field
			And I see the following table columns: Channel name, Token ID, Channel ID, Size, Editors, Viewers, Date created, Last updated, Demo URL, Source URL, Latest community library submission, Actions
			And for each row I see the correct value in the respective column
		When I click on the *Actions* drop-down for a row
		Then I see the following options: View editors, Download PDF, Download CSV, Make public, Delete channel

	Scenario: See the *Kolibri Studio Library* table
		Given I am at *Administration > Channels*
		When I select the *Kolibri Studio Library* option from the *Channel type* drop-down
		Then I see the table with all of the available *Kolibri Studio Library* channels
			And I see an *N channels* label with the total number of created channels
			And I see a *Channel status* filter with *Live* set as the default value and a *Sushi chef* option
			And I see a *Language* filter with no selected value
			And I see a *Search for a channel...* field
			And I see the following table columns: Channel name, Token ID, Channel ID, Size, Editors, Viewers, Date created, Last updated, Demo URL, Source URL, Latest community library submission, Actions
			And for each row I see the correct value in the respective column
		When I click on the *Actions* drop-down for a row
		Then I see the following options: View editors, Download PDF, Download CSV, Make private

	Scenario: See the *Community Library* table
		Given I am at *Administration > Channels*
		When I select the *Community Library* option from the *Channel type* drop-down
		Then I see the table with all of the available *Community Library* channels
			And I see an *N channels* label with the total number of created channels
			And I see a *Channel status* filter with *Live* set as the default value and the following additional options: Needs review, Published, Sushi chef
			And I see a *Language* filter with no selected value
			And I see a *Search for a channel...* field
			And I see the following table columns: Channel name, Token ID, Channel ID, Size, Editors, Viewers, Date created, Last updated, Demo URL, Source URL, Latest community library submission, Actions
			And for each row I see the correct value in the respective column
		When I click on the *Actions* drop-down for a row
		Then I see the following options: View editors, Download PDF, Download CSV, Make public, Delete channel

	Scenario: See the *Unlisted channels* table
		Given I am at *Administration > Channels*
		When I select the *Unlisted channels* option from the *Channel type* drop-down
		Then I see the table with all of the available *Unlisted channels* channels
			And I see an *N channels* label with the total number of created channels
			And I see a *Channel status* filter with *Live* set as the default value and the following additional options: Draft, Published, Sushi chef, Deleted
			And I see a *Language* filter with no selected value
			And I see a *Search for a channel...* field
			And I see the following table columns: Channel name, Token ID, Channel ID, Size, Editors, Viewers, Date created, Last updated, Demo URL, Source URL, Latest community library submission, Actions
			And for each row I see the correct value in the respective column
		When I click on the *Actions* drop-down for a row
		Then I see the following options: View editors, Download PDF, Download CSV, Make public, Delete channel

	Scenario: Filter by status and language
		When I change the value of the *Channel status* drop-down to one of the available values
		Then I see only results matching the applied filter e.g. if I have selected *Published* then I am seeing only published channels
		When I select a value from the *Language* drop-down
		Then I see only results matching the applied language filter
		When there aren't any results for the applied filter or combination of filters
    Then I see a *No users found* message

	Scenario: Search for a channel
		When I enter the name or part of the name of a channel, token, channel id or editor in the *Search for a channel...* field
		Then I am seeing only results matching the entered keyword
		When there aren't any results for the entered keyword
    Then I see a *No users found* message
