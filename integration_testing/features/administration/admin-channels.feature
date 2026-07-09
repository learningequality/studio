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

  Scenario: View the channel details page
  	When I click on the name of a channel
  	Then I see the channel details page
  		And I am at the *Channel info* tab
  		And I can see all of the available channel metadata such as token, version, language etc.

  Scenario: View the channel editors
  	When I click the *Actions* drop-down
  		And I select the *View editors* option
  	Then I see the *Users* table
  		And I can see that a search has been initiated for the specified channel
  		And I can see all of the channel editors

  Scenario: Download the PDF and CSV for a channel
  	When I click the *Actions* drop-down
  		And I select the *Download PDF* option
  	Then I see the *Generating PDF* snackbar message
  		And I can download the generated .pdf file on my device and view it
  	When I click the *Actions* drop-down
  		And I select the *Download CSV* option
  	Then I see the *Generating CSV* snackbar message
  		And I can download the generated .csv file on my device and view it

  Scenario: Make a channel public
  	When I click the *Actions* drop-down
  		And I select the *Make public* option
  	Then I see the *Make channel public* modal
  	When I click the *Make public* button
  	Then I see a *Channel changed to public* snackbar message
  		And I see a green circle icon in front of the channel name indicating that the channel is public

  Scenario: Make a channel private
  	Given I have made a channel public
  	When I click the *Actions* drop-down
  		And I select the *Make private* option
  	Then I see the *Make channel private* modal
  	When I click the *Make private* button
  	Then I see a *Channel changed to private* snackbar message
  		And I no longer see a green circle icon in front of the channel name indicating that the channel is now private

  Scenario: Delete a channel
    When I click the *Actions* drop-down
      And I select the *Delete channel* option
    Then I see a *Delete channel* confirmation modal
    When I click the *Delete* button
    Then I see a *Channel deleted* snackbar message
      And the channel's details are colored in red
      And I see a *Deleted* label in the *Token ID* column
    When I go to the channel's details page
    Then I see a red banner with the following text: This channel has been deleted
    When I click the *Actions* drop-down
   	Then I see the following options: Restore, Delete permanently

  Scenario: Restore a deleted channel
  	Given I have deleted a channel
  	When I click the *Actions* drop-down for the deleted channel
      And I select the *Restore* option
    Then I see the *Restore channel* confirmation modal
    When I click the *Restore* button
    Then I see a *Channel restored* snackbar message
      And I can see that the channel is fully restored

  Scenario: Permanently delete a deleted channel
  	Given I have deleted a channel
  	When I click the *Actions* drop-down for the deleted channel
      And I select the *Delete permanently* option
    Then I see the *Permanently delete channel* confirmation modal
    When I click the *Delete permanently* button
    Then I see a *Channel deleted permanently* snackbar message
      And I can see that the channel is no longer listed in the *All channels* table
