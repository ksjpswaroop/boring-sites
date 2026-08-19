import XCTest
@testable import WordGameCore

final class WordGameCoreTests: XCTestCase {
    func testNormalizeLettersUppercasesFiltersAndCapsAtFifteenLetters() {
        XCTAssertEqual(normalizeLetters("a b-c!123Defghijklmnop"), "ABCDEFGHIJKLMNO")
        XCTAssertEqual(normalizeLetters("WordBridge"), "WORDBRIDGE")
        XCTAssertEqual(normalizeLetters("åçéXYZ"), "XYZ")
        XCTAssertEqual(normalizeLetters(""), "")
    }

    func testBuildIndexUppercasesDedupesSortsAndSkipsSingleLetters() {
        let index = buildIndex(["ape", "pea", "pea", "Tea", "eat", "A", ""])

        XCTAssertEqual(index["AEP"], ["APE", "PEA"])
        XCTAssertEqual(index["AET"], ["EAT", "TEA"])
        XCTAssertNil(index["A"])
        XCTAssertNil(index[""])
    }

    func testSolveReturnsValidWordsFromAnySubsetOfLetters() {
        let index = buildIndex(["ape", "pea", "pear", "reap", "paper", "app", "apple", "plea"])

        XCTAssertEqual(solve("pear", index: index), ["APE", "PEA", "PEAR", "REAP"])
        XCTAssertEqual(solve("Plea!", index: index), ["APE", "PEA", "PLEA"])
    }

    func testSolveHandlesDuplicatesWithoutInventingLetters() {
        let index = buildIndex(["app", "pap", "ape", "pea", "pep", "apple"])

        XCTAssertEqual(solve("app", index: index), ["APP", "PAP"])
        XCTAssertEqual(solve("ap", index: index), [])
        XCTAssertEqual(solve("aapp", index: index), ["APP", "PAP"])
    }

    func testSolveReturnsEmptyForInvalidShortOrImpossibleInputs() {
        let index = buildIndex(["ace", "bad", "cab"])

        XCTAssertEqual(solve("", index: index), [])
        XCTAssertEqual(solve("a", index: index), [])
        XCTAssertEqual(solve("123!!!", index: index), [])
        XCTAssertEqual(solve("zzz", index: index), [])
    }

    func testScrabbleScoreUsesNorthAmericanTileValuesAndIgnoresNonLetters() {
        XCTAssertEqual(scrabbleScore("quiz"), 22)
        XCTAssertEqual(scrabbleScore("WordBridge"), 18)
        XCTAssertEqual(scrabbleScore("a-b!"), 4)
        XCTAssertEqual(scrabbleScore(""), 0)
    }

    func testLoadsBundledWordsJsonAndBuildsReusableDictionary() throws {
        let words = try loadBundledWords()
        XCTAssertGreaterThan(words.count, 1_000)
        XCTAssertTrue(words.contains("apple"))
        XCTAssertTrue(words.contains("pear"))

        let dictionary = try WordDictionary.bundled()
        XCTAssertEqual(dictionary.index["AELPP"], ["APPLE"])
        XCTAssertTrue(dictionary.solve("apple").contains("APPLE"))
    }
}
