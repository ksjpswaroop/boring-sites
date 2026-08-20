import Foundation
import SQLite3

public enum LexiconStoreError: Error, Equatable {
    case missingBundledLexicon
    case unableToOpenLexicon
}

public struct LexiconDefinition: Codable, Equatable, Sendable {
    public let definition: String
    public let example: String?
}

public struct LexiconMeaning: Codable, Equatable, Sendable {
    public let partOfSpeech: String
    public let definitions: [LexiconDefinition]
}

public struct LexiconWordInfo: Codable, Equatable, Sendable {
    public let word: String
    public let phonetic: String
    public let meanings: [LexiconMeaning]
}

public struct LexiconManifest: Codable, Equatable, Sendable {
    public let schemaVersion: Int
    public let language: String
    public let wordCount: Int
    public let signatureCount: Int
    public let detailCount: Int
    public let pronunciationCount: Int
    public let dictionaryHash: String
}

public func loadBundledLexiconManifest() throws -> LexiconManifest {
    try loadBundledLexiconManifest(bundle: .module)
}

public func loadBundledLexiconManifest(bundle: Bundle) throws -> LexiconManifest {
    guard let url = bundle.url(forResource: "lexicon-manifest", withExtension: "json") else {
        throw LexiconStoreError.missingBundledLexicon
    }
    return try JSONDecoder().decode(LexiconManifest.self, from: Data(contentsOf: url))
}

public final class LexiconStore {
    private var database: OpaquePointer?

    public static func bundled() throws -> LexiconStore {
        try bundled(bundle: .module)
    }

    public static func bundled(bundle: Bundle) throws -> LexiconStore {
        guard let url = bundle.url(forResource: "lexicon", withExtension: "sqlite") else {
            throw LexiconStoreError.missingBundledLexicon
        }
        return try LexiconStore(path: url.path)
    }

    public init(path: String) throws {
        guard sqlite3_open_v2(path, &database, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
            if let database { sqlite3_close(database) }
            database = nil
            throw LexiconStoreError.unableToOpenLexicon
        }
    }

    deinit {
        if let database { sqlite3_close(database) }
    }

    public func lookup(_ input: String) -> LexiconWordInfo? {
        let word = normalizeLetters(input)
        guard word.count >= 2, let database else { return nil }

        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(
            database,
            "select phonetic, meanings_json from details where word = ? limit 1",
            -1,
            &statement,
            nil
        ) == SQLITE_OK else {
            return nil
        }
        defer { sqlite3_finalize(statement) }

        let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
        let bindResult = word.withCString { pointer in
            sqlite3_bind_text(statement, 1, pointer, -1, transient)
        }
        guard bindResult == SQLITE_OK, sqlite3_step(statement) == SQLITE_ROW else { return nil }

        let phonetic = sqlite3_column_text(statement, 0).map { String(cString: $0) } ?? ""
        guard let meaningsText = sqlite3_column_text(statement, 1) else { return nil }
        let meaningsData = Data(String(cString: meaningsText).utf8)
        guard let meanings = try? JSONDecoder().decode([LexiconMeaning].self, from: meaningsData) else { return nil }
        return LexiconWordInfo(word: word, phonetic: phonetic, meanings: meanings)
    }
}
