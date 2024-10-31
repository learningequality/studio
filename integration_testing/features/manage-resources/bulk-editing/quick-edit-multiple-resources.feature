Feature: Quick edit fields of multiple resources

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page
			And there are available resources of different types

	Scenario: Edit the language of multiple resources with the same language or no predefined language
		When I select at least two resources
			And I click the *Edit language* icon
		Then I see the *Edit language* modal
		When I select a new language
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the language of multiple resources with the different languages
		When I select at least two resources
			And I click the *Edit language* icon
		Then I see the *Edit language* modal
			And I see *You selected resources in different languages. The language you choose below will be applied to all selected resources.*
		When I select a new language
			And I click the *Save* button
		Then I am back at the page with the resources
				And I see a message: *Changes saved*

	Scenario: Edit the categories of multiple resources with the same categories or no predefined categories
		When I select at least two resources
			And I click the *Edit categories* icon
		Then I see the *Edit categories* modal
		When I select one or several new categories
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the categories of multiple resources with different categories
		When I select at least two resources
			And I click the *Edit categories* icon
		Then I see the *Edit categories* modal
			And I see *You selected resources that have different categories. The categories you choose below will be added to all selected resources. This will not remove existing categories.*
			And I see that all checkboxes are unchecked
		When I select one or several new categories
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the levels of multiple resources with the same levels or no predefined levels
		When I select at least two resources
			And I click the *Edit levels* icon
		Then I see the *Edit levels* modal
		When I select one or several levels
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the levels of multiple resources with different levels
		When I select at least two resources
			And I click the *Edit levels* icon
		Then I see the *Edit levels* modal
			And I see *You selected resources that have different categories. The categories you choose below will be added to all selected resources. This will not remove existing categories.*
			And I see that all checkboxes are unchecked
		When I select one or several levels
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the learning activities of multiple resources with the same learning activities or no predefined activities
		When I select at least two resources
			And I click the *Edit learning activity* icon
		Then I see the *Edit learning activities* modal
		When I select one or several activities
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the learning activities of multiple resources with different learning activities
		When I select at least two resources
			And I click the *Edit learning activity* icon
		Then I see the *Edit learning activities* modal
			And I see *You selected resources that have different categories. The categories you choose below will be added to all selected resources. This will not remove existing categories.*
			And I see that all checkboxes are unchecked
		When I select one or several activities
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the source of multiple resources with the same source or no predefined source
		When I select at least two resources
			And I click the *Edit source* icon
		Then I see the *Edit source* modal
		When I fill in the *Author*, *Provider*, *Aggregator*, *License*, *License description* and *Copyright holder* fields
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the source of multiple resources with different source
		When I select at least two resources
			And I click the *Edit source* icon
		Then I see the *Edit source* modal
			And I see *Mixed* in each field with different source
		When I fill in the *Author*, *Provider*, *Aggregator*, *License*, *License description* and *Copyright holder* fields
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the audience of multiple resources with the same audience or no predefined audience
		When I select at least two resources
			And I click the *Edit audience* icon
		Then I see the *Edit audience* modal
		When I select one of the available *Visible to* options, such as *Coaches* or *Anyone*
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the audience of multiple resources with different audience
		When I select at least two resources
			And I click the *Edit audience* icon
		Then I see the *Edit audience* modal
			And I see *The selected resources are visible to different audiences. Choosing an option below will change the visibility of all selected resources.*
			And I see both *Coaches* and *Anyone* checkboxes are unchecked
		When I select one of the available options
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the requirements section of multiple resources with the same values selected or no predefined values
		When I select at least two resources
			And I click the *Edit requirements* icon
		Then I see the *Edit requirements* modal
		When I select one or several of the available options
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Edit the requirements section of multiple resources with different values set
		When I select at least two resources
			And I click the *Edit requirements* icon
		Then I see the *Edit requirements* modal
			And I see *You selected resources that have different categories. The categories you choose below will be added to all selected resources. This will not remove existing categories.*
			And I see that all checkboxes are unchecked
		When I select one or several of the available options
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Disabled icons when bulk editing both folders and resources
		When I select a folder and a resource
		Then I see the following icons disabled in the top bar: *Edit learning activity*, *Edit source*, *Edit audience*

	Scenario: Hidden icons when bulk editing only folders
		When I select at least two folders
		Then I the following icons are not being displayed in the top bar: *Edit learning activity*, *Edit source*, *Edit audience*
