Feature: Administration - Manage users
  A Kolibri Studio administrator should be able to view and manage users related data

  Background:
    Given Kolibri Studio is accessible at https://studio.learningequality.org/ or any of the test environments
    	And I am signed in as an administrator user
    	And I am at *Administration > Users*

  Scenario: See the users table
    When I look at the *Administration > Users* page
    Then I see the table with all of the available users
      And I see an *N users* label with the total number of registered users
      And I see a *User type* filter with no selected default value
      And I see a *Target location* filter with no selected default value
      And I see a *Joined within* filter with *Any time* set as a default value
      And I see an *Active within* filter with *Any time* set as a default value
      And I see a *Search for a user...* field
      And I see the *Has published a channel* and *Has Studio edits* checkboxes
