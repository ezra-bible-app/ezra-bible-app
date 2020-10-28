# features/bible_browsing.feature

Feature: Bible browsing
  In order to do study the text of a book
  I can open the book for browsing

  @uninstall-kjv
  Scenario: Basic browsing
    Given the KJV is the only translation installed
    And I open the book selection menu
    When I select the book Ephesians
    Then the tab title is "Ephesians [KJV]"
    And the book of Ephesians is opened in the current tab