Feature: Manage folders

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page

	Scenario: Create a folder
		When I click the *Add* button in the top right corner
			And I click the *New folder* option
		Then I see the *New folder* modal
		When I fill in the required field *Title*
			And I fill in any of the other fields such as *Description*, *Tags* and *Language* (optional)
			And I add a thumbnail image (optional)
			And I click the *Finish* button
		Then I am back at the channel editor page
			And I can see the newly created folder

	Scenario: Create an empty folder tree
		When I click the *Add* button in the top right corner
			And I click the *New folder* option
		Then I see the *New folder* modal
		When I fill in the required fields
			And I click the *Add new folder* button
		Then I can fill in the required fields for a new folder #repeat this process for as many empty folders as you need
		When I click the *Finish* button
		Then I am at the channel editor page
			And I can see the empty folders

	Scenario: Create sub-folders
		Given I have created an empty folder tree
		When I click *⋮* (Options) button for a folder
			And I click the *New folder* option
		Then I see the *New folder* modal
		When I fill in the required fields
			And I click the *Add new folder* button
		Then I can fill in the required fields for a new folder #repeat this process for as many empty folders as you need
		When I click the *Finish* button
		Then I am at the channel editor page
			And I can click on the folder to see the created sub-folders
