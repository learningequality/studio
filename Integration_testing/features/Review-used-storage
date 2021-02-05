Feature: Review used storage

	Background: 
		Given I am on the *Settings* page
			And I am on the *Storage* tab

	Scenario: Review used storage
		Given that I have uploaded some resources in my channels
		When I look under the *% storage used* heading
		Then I see the storage use broken down by resources type

	Scenario: No storage used
		Given that I have not uploaded any resources in my channels
		When I look under the *% storage used* heading
		Then I see that there is 0% storage used