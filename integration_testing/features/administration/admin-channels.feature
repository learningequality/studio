Feature: Administration - Manage channels
  A Kolibri Studio administrator should be able to view and manage channels related data

  Background:
    Given Kolibri Studio is accessible at https://studio.learningequality.org/ or any of the test environments
    	And I am signed in as an administrator user
    	And I am at *Administration > Channels*

  Scenario: See the channels table
		When I look at the *Administration > Channels* page
		Then I see the table with all of the available channels
			And I see an *N channels* label with the total number of created channels
			And I see a *Channel type* filter with *All channels* set as the default value
			And I see a *Channel status* filter with *Live* set as the default value
			And I see a *Language* filter with no selected value
			And I see a *Search for a channel...* field
