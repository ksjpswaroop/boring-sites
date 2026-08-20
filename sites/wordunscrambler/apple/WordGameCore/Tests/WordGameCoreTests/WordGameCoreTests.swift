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
        XCTAssertGreaterThan(words.count, 90_000)
        XCTAssertTrue(words.contains("APPLE"))
        XCTAssertTrue(words.contains("PEAR"))
        XCTAssertTrue(words.contains("QI"))
        XCTAssertFalse(words.contains("ZA"))
        XCTAssertTrue(words.contains("PLEA"))
        XCTAssertTrue(words.contains("TONES"))
        XCTAssertTrue(words.contains("BRIDGE"))
        XCTAssertTrue(words.contains("SWOOP"))
        XCTAssertTrue(words.contains("PASTER"))
        XCTAssertTrue(words.contains("WALKED"))
        XCTAssertFalse(words.contains("OO"))
        XCTAssertFalse(words.contains("NASA"))
        XCTAssertFalse(words.contains("FBI"))
        XCTAssertFalse(words.contains("AARON"))

        let index = try loadBundledIndex()
        XCTAssertGreaterThan(index.count, 80_000)
        XCTAssertTrue(index["AELPP"]?.contains("APPLE") == true)
        XCTAssertTrue(index["IQ"]?.contains("QI") == true)

        let dictionary = try WordDictionary.bundled()
        XCTAssertTrue(dictionary.index["AELPP"]?.contains("APPLE") == true)
        XCTAssertTrue(dictionary.solve("apple").contains("APPLE"))
        XCTAssertTrue(dictionary.solve("tones").contains("TONES"))
        XCTAssertTrue(dictionary.solve("wordbridge").contains("BRIDGE"))
    }

    func testLoadsBundledSwoopDetailsWithoutNetworkAccess() throws {
        let lexicon = try LexiconStore.bundled()
        let info = try XCTUnwrap(lexicon.lookup("SWOOP"))

        XCTAssertEqual(info.word, "SWOOP")
        XCTAssertTrue(info.phonetic.lowercased().contains("swu"))
        XCTAssertTrue(info.meanings.contains { $0.partOfSpeech == "noun" || $0.partOfSpeech == "verb" })
        XCTAssertTrue(info.meanings.flatMap(\.definitions).contains { $0.definition.lowercased().contains("move") })
        XCTAssertNil(lexicon.lookup("OO"))

        let manifest = try loadBundledLexiconManifest()
        XCTAssertEqual(manifest.wordCount, try loadBundledWords().count)
        XCTAssertEqual(manifest.schemaVersion, 1)
        XCTAssertEqual(manifest.dictionaryHash.count, 64)
    }
}
