Feature: Set up empty folder tree

	Background:
		Given I am signed in to Studio
			And I am on the channel editor page for an empty channel

	Scenario: Create an empty folder tree
		When I click the *Add* button in the top right corner
			And I click the *New folder* option
		Then I see the *New folder* modal
		When I fill in the required fields
			And I click the *Add new folder* button
		Then I can fill in the required fields for a new folder #repeat this process for as many empty folders you need
		When I click the *Finish* button
		Then I am on the channel editor page
			And I can see the empty folders

	Scenario: Create sub-folders
		Given I have created an empty folder tree
		When I click *⋮* (Options) button for a folder
			And I click the *New folder* option
		Then I see the *New folder* modal
		When I fill in the required fields
			And I click the *Add new folder* button
		Then I can fill in the required fields for a new folder #repeat this process for as many empty folders you need
		When I click the *Finish* button
		Then I am on the channel editor page
			And I can click on the folder to see the created sub-folders
