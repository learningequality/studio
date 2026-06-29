Feature: Administration - Manage users
  A Kolibri Studio administrator should be able to view and manage users related data

  Background:
    Given Kolibri Studio is accessible at https://studio.learningequality.org/ or any of the test environments
    	And I am signed in as an administrator user
    	And I am at *Administration > Users*

  Scenario: View the users table
    When I look at the *Administration > Users* page
    Then I see the table with all of the available users
      And I see an *N users* label with the total number of registered users
      And I see a *User type* filter with no selected default value
      And I see a *Target location* filter with no selected default value
      And I see a *Joined within* filter with *Any time* set as a default value
      And I see an *Active within* filter with *Any time* set as a default value
      And I see a *Search for a user...* field
      And I see the *Has published a channel* and *Has Studio edits* checkboxes
      And I see the following table columns: Email, Disk space, Can edit, Can view, Date joined, Last active, Actions
      And for each row I see the correct value in the respective column
    When I click on the *Actions* drop-down for a row
    Then I see the following options: Email, Activate, Delete

  Scenario: Filter by any of the available filters
    When I change the value of any of the available filters
    Then I see only results matching the applied filter e.g. if I have selected *Active* from the *User type* filter then I am seeing only published channels
    When there aren't any results for the applied filter or combination of filters
    Then I see a *No users found* message

  Scenario: Search for a user
    When I enter the name or part of the name of a user, email or channel in the *Search for a user...* field
    Then I am seeing only results matching the entered keyword
    When there aren't any results for the entered keyword
    Then I see a *No users found* message

  Scenario: See the user's details
    When I click on the name of the user
    Then I see the user's details page with the full name of the user
      And I see an *Actions* drop-down 
      And I see the *Basic information* section with the following fields: Privileges, Email, Where do you plan to use Kolibri?, How did you hear about us?, How do you plan to use Kolibri Studio?, Signed up on, Last active
      And I see the *Disk space* section with the percentage of storage used and an option to increase the storage size
      And I see the *Feature flags* section
      And I see the *Policies accepted* section
      And I see the *Editing N channels* and *Viewing N channels* sections

  Scenario: Download CSV
    Given I have applied at least one of the available filters
    When I click on the *Download CSV* button
    Then I see a *Generating CSV* snackbar message
      And I see a *Save as* modal
    When I chose a destination for the studio_users<date>.csv file
      And I click the *Save* button
    Then the .csv file is saved on my device
    When I open the file
    Then I see that all the information for each user is exported correctly
      And I see the following columns: First name, Last name, Email, Is active, Is admin, Date joined, Last active, Disk space (bytes), Disk space used (bytes), Has editable channels, Has viewable channels, Has published a channel, Most recent publish date, Has Studio edits, Locations (country names), Primary location, Location count, Storage needed, Heard from

  Scenario: Email users
    When I click on the *Email users* button
    Then I see a *Send email* modal window with an email form with prefilled *From* and *To* fields
      And I see a *Subject line* field, an *Add placeholder to message* option and an *Email body* field.
    When I fill in all the fields
      And I click the *Send email* button
    Then I see an *Email sent* snackbar message

  Scenario: Add and remove admin privileges
    When I click the *Actions* drop-down for a user
      And I select the *Add admin privileges* option
    Then I see an *Add admin privileges* confirmation modal
      And I see an *Email address* field
    When I fill in my email address
      And I click the *Add privileges* button
    Then I see an *Admin privileges added* snackbar message
      And I see a green circle to the left of the user's name indicating that the user is now an administrator
    When I click the *Actions* drop-down for the same user
      And I select the *Remove admin privileges* option
    Then I see an *Remove admin privileges* confirmation modal
      And I see an *Email address* field
    When I fill in my email address
      And I click the *Remove privileges* button
    Then I see an *Admin privilege removed* snackbar message
      And the green circle is removed indicating that the user is no longer an administrator

  Scenario: Deactivate a user
    When I click the *Actions* drop-down for a user
      And I select the *Deactivate* option
    Then I see a *Deactivate user* confirmation modal
    When I click the *Deactivate* button
    Then I see an *User deactivated* snackbar message
      And the user's details are colored in red
      And I see an *Inactive* label in the *Disk space* column
    When I go to the user's details page
    Then I see a red banner with the following text: This user has been deactivated
    When I click the *Actions* drop-down
      And I click the *Activate* option
    Then I see an *User activated* message
      And the red banner has disappeared

  Scenario: Delete a deactivated user
    Given I have deactivated a user
    When I go to the user's details page
      And I click the *Actions* drop-down list
      And I select the *Delete* option
    Then I see a *Delete user* confirmation modal
    When I click the *Delete* button
    Then I see a *User removed* snackbar message
      And the user is no longer listed in the users table
