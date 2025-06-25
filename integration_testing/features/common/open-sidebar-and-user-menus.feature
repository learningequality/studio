Feature: Open and close sidebar and user menus
User needs to be able to open and close the sidebar menu and the user menu

  Background:
    Given I am signed in to Studio

  Scenario: Open and close the sidebar menu
    When I click the hamburger menu button in the upper left screen corner
    Then I see the sidebar menu
      And I can see the following options: *Channels*, *Settings*, *Change language*, *Help and support*, *Sign out*, the LE logo,  *© 2025 Learning Equality", *Give feedback*
      And I can click any of the options inside
    When I click the *X* button, or anywhere on the browser screen
    Then I don't see the sidebar menu anymore

  Scenario: Open and close the user menu
    When I click the user menu button in the upper right screen corner
    Then I see the user menu
      And I can see the following options: *Settings*, *Change language*, *Help and support*, *Sign out*
      And I can click any of the options inside
    When I click the user menu button again, or anywhere on the browser screen
    Then I don't see the user menu anymore
