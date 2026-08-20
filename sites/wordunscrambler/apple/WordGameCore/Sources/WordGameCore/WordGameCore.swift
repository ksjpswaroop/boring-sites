import Foundation

public enum WordGameCoreError: Error, Equatable {
    case missingBundledWords
    case missingBundledIndex
    case invalidBundledWords
    case invalidBundledIndex
}

public func normalizeLetters(_ input: String) -> String {
    let scalars = input.uppercased().unicodeScalars.lazy
        .filter { scalar in
            scalar.value >= 65 && scalar.value <= 90
        }
        .prefix(15)

    return String(String.UnicodeScalarView(scalars))
}

private func signature(_ word: String) -> String {
    String(word.uppercased().sorted())
}

public func buildIndex(_ words: [String]) -> [String: [String]] {
    var index: [String: Set<String>] = [:]

    for word in words {
        let uppercased = word.uppercased()
        guard uppercased.count >= 2 else { continue }

        let key = signature(uppercased)
        index[key, default: []].insert(uppercased)
    }

    return index.mapValues { bucket in
        bucket.sorted()
    }
}

public func solve(_ letters: String, index: [String: [String]]) -> [String] {
    let normalized = normalizeLetters(letters)
    guard normalized.count >= 2 else { return [] }

    let counts = normalized.reduce(into: [Character: Int]()) { partialResult, character in
        partialResult[character, default: 0] += 1
    }
    let lettersByKind = counts.keys.sorted()

    var seen = Set<String>()
    var results: [String] = []

    func appendBucket(for key: String) {
        guard let bucket = index[key] else { return }

        for word in bucket where !seen.contains(word) {
            seen.insert(word)
            results.append(word)
        }
    }

    func visit(letterIndex: Int, currentSignature: String) {
        if currentSignature.count >= 2 {
            appendBucket(for: currentSignature)
        }

        guard letterIndex < lettersByKind.count else { return }

        let letter = lettersByKind[letterIndex]
        let maxCount = counts[letter, default: 0]

        for count in 0...maxCount {
            visit(
                letterIndex: letterIndex + 1,
                currentSignature: currentSignature + String(repeating: String(letter), count: count)
            )
        }
    }

    visit(letterIndex: 0, currentSignature: "")
    return results
}

public func scrabbleScore(_ word: String) -> Int {
    let scores: [Character: Int] = [
        "A": 1, "E": 1, "I": 1, "O": 1, "U": 1, "L": 1, "N": 1, "S": 1, "T": 1, "R": 1,
        "D": 2, "G": 2,
        "B": 3, "C": 3, "M": 3, "P": 3,
        "F": 4, "H": 4, "V": 4, "W": 4, "Y": 4,
        "K": 5,
        "J": 8, "X": 8,
        "Q": 10, "Z": 10
    ]

    return word.uppercased().reduce(0) { total, character in
        total + (scores[character] ?? 0)
    }
}

public func loadBundledWords() throws -> [String] {
    try loadBundledWords(bundle: .module)
}

public func loadBundledWords(bundle: Bundle) throws -> [String] {
    guard let url = bundle.url(forResource: "words", withExtension: "json") else {
        throw WordGameCoreError.missingBundledWords
    }

    let data = try Data(contentsOf: url)
    let words = try JSONDecoder().decode([String].self, from: data)

    guard !words.isEmpty else {
        throw WordGameCoreError.invalidBundledWords
    }

    return words
}

public func loadBundledIndex() throws -> [String: [String]] {
    try loadBundledIndex(bundle: .module)
}

public func loadBundledIndex(bundle: Bundle) throws -> [String: [String]] {
    guard let url = bundle.url(forResource: "anagram-index", withExtension: "json") else {
        throw WordGameCoreError.missingBundledIndex
    }

    let data = try Data(contentsOf: url)
    let index = try JSONDecoder().decode([String: [String]].self, from: data)

    guard !index.isEmpty else {
        throw WordGameCoreError.invalidBundledIndex
    }

    return index
}

public struct WordDictionary: Equatable {
    public let words: [String]
    public let index: [String: [String]]

    public init(words: [String]) {
        self.words = words
        self.index = buildIndex(words)
    }

    public init(words: [String], index: [String: [String]]) {
        self.words = words
        self.index = index
    }

    public static func bundled() throws -> WordDictionary {
        try bundled(bundle: .module)
    }

    public static func bundled(bundle: Bundle) throws -> WordDictionary {
        WordDictionary(
            words: try loadBundledWords(bundle: bundle),
            index: try loadBundledIndex(bundle: bundle)
        )
    }

    public func solve(_ letters: String) -> [String] {
        WordGameCore.solve(letters, index: index)
    }
}
