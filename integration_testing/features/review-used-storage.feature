Feature: Review used storage

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on the *Settings > Storage* page

	Scenario: Review used storage
		Given I have uploaded some resources in my channels
		When I look under the *% storage used* heading
		Then I see the storage use broken down by resources type

	Scenario: No storage used
		Given that I have not uploaded any resources in my channels
		When I look under the *% storage used* heading
		Then I see that there is 0% storage used