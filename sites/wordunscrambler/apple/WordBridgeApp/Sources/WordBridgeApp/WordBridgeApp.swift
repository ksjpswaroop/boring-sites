import Foundation
import SwiftUI
@preconcurrency import UserNotifications
import WordGameCore

public enum WordBridgeGame: String, CaseIterable, Codable, Equatable, Hashable, Identifiable, Sendable {
    case wordUnscrambler
    case anagramRush
    case dailyScramble
    case spellingBee
    case guessTheWord

    public var id: String { rawValue }
    public var title: String {
        switch self {
        case .wordUnscrambler:
            "Word Unscrambler"
        case .anagramRush:
            "Anagram Rush"
        case .dailyScramble:
            "Daily Scramble"
        case .spellingBee:
            "Spelling Bee"
        case .guessTheWord:
            "Guess the Word"
        }
    }

    public var systemImage: String {
        switch self {
        case .wordUnscrambler:
            "textformat.abc"
        case .anagramRush:
            "timer"
        case .dailyScramble:
            "calendar"
        case .spellingBee:
            "hexagon"
        case .guessTheWord:
            "questionmark.square"
        }
    }
}

public enum WordBridgeCatalog {
    public static let v1Games: [WordBridgeGame] = [
        .wordUnscrambler,
        .anagramRush,
        .dailyScramble,
        .spellingBee,
        .guessTheWord
    ]
}

public enum WordBridgePolicy {
    public static let hasAds = false
    public static let requiresLogin = false
    public static let usesBackend = false
    public static let hasPayments = false
    public static let supportsOfflinePlay = true
}

public enum AnalyticsEventName: String, Codable, Equatable, Hashable, Sendable {
    case appInstalled
    case sessionStarted
    case dailyCompleted
    case rushRoundCompleted
    case shareCardCreated
    case crashReported
    case feedbackSubmitted
}

public enum AnalyticsPropertyKey: String, Codable, Equatable, Hashable, Sendable {
    case game
    case scoreBucket
    case durationBucket
    case resultCountBucket
    case rawLetters
    case rawWord
    case email
    case deviceIdentifier
    case freeText

    public var isPrivacySafe: Bool {
        switch self {
        case .game, .scoreBucket, .durationBucket, .resultCountBucket:
            true
        case .rawLetters, .rawWord, .email, .deviceIdentifier, .freeText:
            false
        }
    }
}

public struct AnalyticsEvent: Codable, Equatable, Sendable {
    public let name: AnalyticsEventName
    public let occurredAt: Date
    public let properties: [AnalyticsPropertyKey: String]

    public init(
        name: AnalyticsEventName,
        occurredAt: Date,
        properties: [AnalyticsPropertyKey: String] = [:]
    ) {
        self.name = name
        self.occurredAt = occurredAt
        self.properties = properties
    }

    public var isPrivacySafe: Bool {
        properties.keys.allSatisfy(\.isPrivacySafe)
    }
}

public enum PrivacyPreservingAnalytics {
    public static func sanitize(_ event: AnalyticsEvent) -> AnalyticsEvent {
        AnalyticsEvent(
            name: event.name,
            occurredAt: event.occurredAt,
            properties: event.properties.filter { key, _ in key.isPrivacySafe }
        )
    }
}

public protocol AnalyticsRecording {
    func record(_ event: AnalyticsEvent)
}

public final class LocalAnalyticsRecorder: AnalyticsRecording {
    public private(set) var events: [AnalyticsEvent]

    public init(events: [AnalyticsEvent] = []) {
        self.events = events
    }

    public func record(_ event: AnalyticsEvent) {
        events.append(PrivacyPreservingAnalytics.sanitize(event))
    }
}

public struct RetentionMetrics: Codable, Equatable, Sendable {
    public let dailyCompletionRate: Double
    public let rushReplayRate: Double
    public let sevenDayRetentionRate: Double
    public let shareUsageCount: Int
    public let crashCount: Int

    public init(
        dailyCompletionRate: Double,
        rushReplayRate: Double,
        sevenDayRetentionRate: Double,
        shareUsageCount: Int,
        crashCount: Int
    ) {
        self.dailyCompletionRate = dailyCompletionRate
        self.rushReplayRate = rushReplayRate
        self.sevenDayRetentionRate = sevenDayRetentionRate
        self.shareUsageCount = shareUsageCount
        self.crashCount = crashCount
    }
}

public struct RetentionMetricsCalculator {
    private let calendar: Calendar

    public init(calendar: Calendar = .current) {
        self.calendar = calendar
    }

    public func calculate(events: [AnalyticsEvent]) -> RetentionMetrics {
        let sanitizedEvents = events.map(PrivacyPreservingAnalytics.sanitize)
        let sessionDays = Set(
            sanitizedEvents
                .filter { $0.name == .sessionStarted }
                .map { calendar.startOfDay(for: $0.occurredAt) }
        )
        let dailyCompletionDays = Set(
            sanitizedEvents
                .filter { $0.name == .dailyCompleted }
                .map { calendar.startOfDay(for: $0.occurredAt) }
        )
        let dailyCompletionRate = sessionDays.isEmpty
            ? 0
            : Double(dailyCompletionDays.count) / Double(sessionDays.count)

        let rushRounds = sanitizedEvents.filter { $0.name == .rushRoundCompleted }
        let rushReplayRate = rushRounds.isEmpty
            ? 0
            : Double(max(0, rushRounds.count - 1)) / Double(rushRounds.count)

        let installDays = sanitizedEvents
            .filter { $0.name == .appInstalled }
            .map { calendar.startOfDay(for: $0.occurredAt) }
        let retainedInstalls = installDays.filter { installDay in
            guard let seventhDay = calendar.date(byAdding: .day, value: 7, to: installDay) else {
                return false
            }
            return sessionDays.contains(calendar.startOfDay(for: seventhDay))
        }
        let sevenDayRetentionRate = installDays.isEmpty
            ? 0
            : Double(retainedInstalls.count) / Double(installDays.count)

        return RetentionMetrics(
            dailyCompletionRate: min(dailyCompletionRate, 1),
            rushReplayRate: min(rushReplayRate, 1),
            sevenDayRetentionRate: min(sevenDayRetentionRate, 1),
            shareUsageCount: sanitizedEvents.filter { $0.name == .shareCardCreated }.count,
            crashCount: sanitizedEvents.filter { $0.name == .crashReported }.count
        )
    }
}

public enum FeedbackCategory: String, Codable, Equatable, Hashable, Sendable {
    case onboarding
    case difficulty
    case dictionaryQuality
    case gameBalance
}

public enum FeedbackSeverity: Int, Codable, Equatable, Comparable, Sendable {
    case low = 1
    case medium = 2
    case high = 3

    public static func < (lhs: FeedbackSeverity, rhs: FeedbackSeverity) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}

public struct FeedbackRecord: Codable, Equatable, Sendable {
    public let category: FeedbackCategory
    public let message: String
    public let severity: FeedbackSeverity

    public init(category: FeedbackCategory, message: String, severity: FeedbackSeverity) {
        self.category = category
        self.message = message
        self.severity = severity
    }
}

public struct ImprovementItem: Codable, Equatable, Sendable {
    public let area: FeedbackCategory
    public let priority: FeedbackSeverity
    public let summary: String
}

public struct FeedbackInbox: Codable, Equatable, Sendable {
    public let records: [FeedbackRecord]

    public init(records: [FeedbackRecord]) {
        self.records = records
    }

    public var topPriority: FeedbackRecord? {
        records.sorted { lhs, rhs in
            lhs.severity > rhs.severity
        }.first
    }

    public var improvementBacklog: [ImprovementItem] {
        records
            .sorted { lhs, rhs in lhs.severity > rhs.severity }
            .map { record in
                ImprovementItem(
                    area: record.category,
                    priority: record.severity,
                    summary: record.message
                )
            }
    }
}

public enum MonetizationReadinessGate {
    public static func canConsiderAds(metrics: RetentionMetrics, feedback: FeedbackInbox) -> Bool {
        !WordBridgePolicy.hasAds
            && metrics.dailyCompletionRate >= 0.50
            && metrics.rushReplayRate >= 0.30
            && metrics.sevenDayRetentionRate >= 0.20
            && metrics.shareUsageCount > 0
            && metrics.crashCount == 0
            && !feedback.records.isEmpty
    }
}

public enum RetentionReviewStatus: String, Codable, Equatable, Sendable {
    case needsIteration
    case readyForMoreTesters
}

public enum RetentionImprovementArea: String, Codable, Equatable, Hashable, Sendable {
    case stability
    case onboarding
    case difficulty
    case dictionaryQuality
    case gameBalance
    case sharing

    fileprivate var sortOrder: Int {
        switch self {
        case .stability:
            0
        case .onboarding:
            1
        case .difficulty:
            2
        case .dictionaryQuality:
            3
        case .gameBalance:
            4
        case .sharing:
            5
        }
    }
}

public struct RetentionImprovement: Codable, Equatable, Sendable {
    public let area: RetentionImprovementArea
    public let priority: FeedbackSeverity
    public let summary: String

    public init(area: RetentionImprovementArea, priority: FeedbackSeverity, summary: String) {
        self.area = area
        self.priority = priority
        self.summary = summary
    }
}

public struct RetentionValidationThresholds: Codable, Equatable, Sendable {
    public let minimumDailyCompletionRate: Double
    public let minimumRushReplayRate: Double
    public let minimumSevenDayRetentionRate: Double
    public let minimumShareUsageCount: Int
    public let maximumCrashCount: Int

    public init(
        minimumDailyCompletionRate: Double = 0.50,
        minimumRushReplayRate: Double = 0.30,
        minimumSevenDayRetentionRate: Double = 0.20,
        minimumShareUsageCount: Int = 1,
        maximumCrashCount: Int = 0
    ) {
        self.minimumDailyCompletionRate = minimumDailyCompletionRate
        self.minimumRushReplayRate = minimumRushReplayRate
        self.minimumSevenDayRetentionRate = minimumSevenDayRetentionRate
        self.minimumShareUsageCount = minimumShareUsageCount
        self.maximumCrashCount = maximumCrashCount
    }
}

public struct RetentionValidationReview: Codable, Equatable, Sendable {
    public let status: RetentionReviewStatus
    public let metrics: RetentionMetrics
    public let feedback: FeedbackInbox
    public let improvements: [RetentionImprovement]
    public let canConsiderMonetization: Bool
}

public struct RetentionImprovementPlanner {
    private let thresholds: RetentionValidationThresholds

    public init(thresholds: RetentionValidationThresholds = .init()) {
        self.thresholds = thresholds
    }

    public func review(metrics: RetentionMetrics, feedback: FeedbackInbox) -> RetentionValidationReview {
        let improvements = prioritizedImprovements(metrics: metrics, feedback: feedback)
        let canConsiderMonetization = improvements.isEmpty
            && MonetizationReadinessGate.canConsiderAds(metrics: metrics, feedback: feedback)

        return RetentionValidationReview(
            status: improvements.isEmpty ? .readyForMoreTesters : .needsIteration,
            metrics: metrics,
            feedback: feedback,
            improvements: improvements,
            canConsiderMonetization: canConsiderMonetization
        )
    }

    private func prioritizedImprovements(metrics: RetentionMetrics, feedback: FeedbackInbox) -> [RetentionImprovement] {
        var improvements: [RetentionImprovement] = []

        if metrics.crashCount > thresholds.maximumCrashCount {
            improvements.append(.init(
                area: .stability,
                priority: .high,
                summary: "Fix crashes before expanding TestFlight or considering monetization."
            ))
        }

        if metrics.dailyCompletionRate < thresholds.minimumDailyCompletionRate {
            improvements.append(.init(
                area: .onboarding,
                priority: .high,
                summary: "Improve the first-run and daily puzzle flow until daily completion reaches the validation target."
            ))
        }

        if feedback.records.isEmpty {
            improvements.append(.init(
                area: .onboarding,
                priority: .medium,
                summary: "Collect qualitative TestFlight feedback before making monetization decisions."
            ))
        }

        if metrics.rushReplayRate < thresholds.minimumRushReplayRate {
            improvements.append(.init(
                area: .difficulty,
                priority: .medium,
                summary: "Tune Anagram Rush timing and puzzle difficulty until replay rate reaches the validation target."
            ))
        }

        if metrics.sevenDayRetentionRate < thresholds.minimumSevenDayRetentionRate {
            improvements.append(.init(
                area: .gameBalance,
                priority: .high,
                summary: "Rebalance the daily loop and rewards until 7-day retention reaches the validation target."
            ))
        }

        if metrics.shareUsageCount < thresholds.minimumShareUsageCount {
            improvements.append(.init(
                area: .sharing,
                priority: .medium,
                summary: "Improve share-card timing and copy until sharing is observed in beta usage."
            ))
        }

        improvements.append(contentsOf: feedback.records.compactMap(Self.feedbackImprovement))

        return improvements.sorted { lhs, rhs in
            if lhs.priority != rhs.priority {
                return lhs.priority > rhs.priority
            }
            return lhs.area.sortOrder < rhs.area.sortOrder
        }
    }

    private static func feedbackImprovement(_ record: FeedbackRecord) -> RetentionImprovement? {
        guard record.severity != .low else {
            return nil
        }

        return RetentionImprovement(
            area: RetentionImprovementArea(record.category),
            priority: record.severity,
            summary: record.message
        )
    }
}

private extension RetentionImprovementArea {
    init(_ feedbackCategory: FeedbackCategory) {
        switch feedbackCategory {
        case .onboarding:
            self = .onboarding
        case .difficulty:
            self = .difficulty
        case .dictionaryQuality:
            self = .dictionaryQuality
        case .gameBalance:
            self = .gameBalance
        }
    }
}

public struct FeedbackThemeSummary: Codable, Equatable, Sendable {
    public let category: FeedbackCategory
    public let count: Int
    public let highestSeverity: FeedbackSeverity

    public init(category: FeedbackCategory, count: Int, highestSeverity: FeedbackSeverity) {
        self.category = category
        self.count = count
        self.highestSeverity = highestSeverity
    }
}

public struct BetaValidationReport: Codable, Equatable, Sendable {
    public let generatedAt: Date
    public let status: RetentionReviewStatus
    public let metrics: RetentionMetrics
    public let feedbackThemes: [FeedbackThemeSummary]
    public let improvements: [RetentionImprovementArea]
    public let canConsiderMonetization: Bool
}

public struct BetaValidationReportGenerator {
    private let planner: RetentionImprovementPlanner

    public init(calendar _: Calendar = .current, planner: RetentionImprovementPlanner = .init()) {
        self.planner = planner
    }

    public func makeReport(
        metrics: RetentionMetrics,
        feedback: FeedbackInbox,
        generatedAt: Date = Date()
    ) -> BetaValidationReport {
        let review = planner.review(metrics: metrics, feedback: feedback)

        return BetaValidationReport(
            generatedAt: generatedAt,
            status: review.status,
            metrics: metrics,
            feedbackThemes: Self.feedbackThemes(from: feedback),
            improvements: review.improvements.map(\.area),
            canConsiderMonetization: review.canConsiderMonetization
        )
    }

    private static func feedbackThemes(from feedback: FeedbackInbox) -> [FeedbackThemeSummary] {
        Dictionary(grouping: feedback.records, by: \.category)
            .map { category, records in
                FeedbackThemeSummary(
                    category: category,
                    count: records.count,
                    highestSeverity: records.map(\.severity).max() ?? .low
                )
            }
            .sorted { lhs, rhs in
                if lhs.highestSeverity != rhs.highestSeverity {
                    return lhs.highestSeverity > rhs.highestSeverity
                }
                if lhs.count != rhs.count {
                    return lhs.count > rhs.count
                }
                return lhs.category.rawValue < rhs.category.rawValue
            }
    }
}

public enum TestFlightRequiredInput: String, Codable, Equatable, Hashable, Sendable {
    case appleDistributionCertificate
    case appStoreConnectAppRecord
    case appStoreConnectApiKey
    case provisioningProfile
    case betaTesterGroup
}

public enum BetaValidationGoal: String, Codable, Equatable, Hashable, Sendable {
    case retention
    case dailyCompletion
    case replayRate
    case shareUsage
    case crashes
    case feedback
}

public struct TestFlightLaunchPlan: Codable, Equatable, Sendable {
    public let bundleIdentifier: String
    public let requiredExternalInputs: [TestFlightRequiredInput]
    public let betaGoals: [BetaValidationGoal]

    public static let defaultPlan = TestFlightLaunchPlan(
        bundleIdentifier: "com.boringsites.wordbridge",
        requiredExternalInputs: [
            .appleDistributionCertificate,
            .appStoreConnectAppRecord,
            .appStoreConnectApiKey,
            .provisioningProfile,
            .betaTesterGroup
        ],
        betaGoals: [
            .retention,
            .dailyCompletion,
            .replayRate,
            .shareUsage,
            .crashes,
            .feedback
        ]
    )
}

public enum AppleDeviceRole: String, CaseIterable, Codable, Equatable, Sendable {
    case iPad
    case mac
    case watch
    case tv
    case vision
}

public enum DeviceExperiencePattern: String, Codable, Equatable, Sendable {
    case splitViewDashboard
    case keyboardDashboard
    case companionGlance
    case partyMode
    case spatialBoard
}

public struct DeviceExperience: Codable, Equatable, Sendable {
    public let role: AppleDeviceRole
    public let title: String
    public let primaryPattern: DeviceExperiencePattern
    public let supportedGames: [WordBridgeGame]
    public let features: [String]
}

public enum WordBridgeEcosystem {
    public static let phase3Experiences: [DeviceExperience] = [
        .init(
            role: .iPad,
            title: "iPad dashboard",
            primaryPattern: .splitViewDashboard,
            supportedGames: WordBridgeCatalog.v1Games,
            features: ["split view", "larger boards", "stats"]
        ),
        .init(
            role: .mac,
            title: "Mac command center",
            primaryPattern: .keyboardDashboard,
            supportedGames: WordBridgeCatalog.v1Games,
            features: ["keyboard first", "history", "longer sessions"]
        ),
        .init(
            role: .watch,
            title: "Watch companion",
            primaryPattern: .companionGlance,
            supportedGames: [.dailyScramble],
            features: ["streak glance", "daily reminder", "completion status"]
        ),
        .init(
            role: .tv,
            title: "TV party mode",
            primaryPattern: .partyMode,
            supportedGames: [.guessTheWord, .anagramRush],
            features: ["large screen", "remote friendly", "timed rounds"]
        ),
        .init(
            role: .vision,
            title: "Vision spatial board",
            primaryPattern: .spatialBoard,
            supportedGames: [.wordUnscrambler, .dailyScramble, .spellingBee],
            features: ["spatial tiles", "depth", "board presentation"]
        )
    ]

    public static func experience(for role: AppleDeviceRole) -> DeviceExperience {
        phase3Experiences.first { $0.role == role } ?? phase3Experiences[0]
    }
}

public enum DashboardLayout: String, Codable, Equatable, Sendable {
    case list
    case splitView
}

public enum BoardSize: String, Codable, Equatable, Sendable {
    case compact
    case regular
    case large
}

public struct GameStat: Codable, Equatable, Identifiable, Sendable {
    public var id: WordBridgeGame { game }
    public let game: WordBridgeGame
    public let bestScore: Int
    public let sessions: Int
}

public struct IPadDashboardModel: Codable, Equatable, Sendable {
    public let layout: DashboardLayout
    public let boardSize: BoardSize
    public let selectedGame: WordBridgeGame
    public let stats: [GameStat]
    public let statsSummary: String

    public init(progress: WordBridgeProgress, selectedGame: WordBridgeGame = .dailyScramble) {
        self.layout = .splitView
        self.boardSize = .large
        self.selectedGame = selectedGame
        self.stats = WordBridgeCatalog.v1Games.map { game in
            GameStat(
                game: game,
                bestScore: progress.bestScores[game] ?? 0,
                sessions: progress.completedSessions
            )
        }
        self.statsSummary = "\(progress.completedSessions) sessions, \(progress.currentStreak)-day streak"
    }
}

public enum WordBridgeKeyModifier: String, Codable, Equatable, Hashable, Sendable {
    case command
    case shift
    case option
    case control
}

public struct KeyboardShortcutSpec: Codable, Equatable, Hashable, Sendable {
    public let key: String
    public let modifiers: [WordBridgeKeyModifier]
    public let action: String

    public init(key: String, modifiers: [WordBridgeKeyModifier], action: String) {
        self.key = key
        self.modifiers = modifiers
        self.action = action
    }
}

public struct MacDashboardModel: Codable, Equatable, Sendable {
    public let isKeyboardFirst: Bool
    public let defaultSessionMinutes: Int
    public let history: [GameCompletion]
    public let shortcuts: [KeyboardShortcutSpec]

    public init(history: [GameCompletion] = []) {
        self.isKeyboardFirst = true
        self.defaultSessionMinutes = 20
        self.history = history
        self.shortcuts = [
            .init(key: "N", modifiers: [.command], action: "New round"),
            .init(key: "Return", modifiers: [], action: "Submit word"),
            .init(key: "1", modifiers: [.command], action: "Open Today"),
            .init(key: "S", modifiers: [.command], action: "Share score")
        ]
    }
}

public enum DailyCompletionStatus: String, Codable, Equatable, Sendable {
    case complete
    case notComplete
}

public struct WatchCompanionModel: Codable, Equatable, Sendable {
    public let streakText: String
    public let reminderTitle: String
    public let completionStatus: DailyCompletionStatus
    public let sessionsText: String

    public init(progress: WordBridgeProgress, isDailyComplete: Bool) {
        self.streakText = progress.currentStreak == 1
            ? "1-day streak"
            : "\(progress.currentStreak)-day streak"
        self.reminderTitle = "Daily Scramble"
        self.completionStatus = isDailyComplete ? .complete : .notComplete
        self.sessionsText = "\(progress.completedSessions) sessions"
    }
}

public enum TVInputMode: String, Codable, Equatable, Sendable {
    case remoteFriendly
}

public struct TVPartyModeModel: Codable, Equatable, Sendable {
    public let supportedGames: [WordBridgeGame]
    public let roundSeconds: Int
    public let inputMode: TVInputMode
    public let largeScreenPrompt: String

    public init(roundSeconds: Int = 90) {
        self.supportedGames = [.guessTheWord, .anagramRush]
        self.roundSeconds = roundSeconds
        self.inputMode = .remoteFriendly
        self.largeScreenPrompt = "WordBridge party round"
    }
}

public struct SpatialPosition: Codable, Equatable, Sendable {
    public let x: Double
    public let y: Double
    public let z: Double
}

public struct SpatialTile: Codable, Equatable, Identifiable, Sendable {
    public var id: Int { index }
    public let index: Int
    public let letter: String
    public let position: SpatialPosition
}

public struct VisionSpatialTileBoardConcept: Codable, Equatable, Sendable {
    public let presentation: DeviceExperiencePattern
    public let tiles: [SpatialTile]

    public init(letters: String) {
        let normalized = normalizeLetters(letters)
        self.presentation = .spatialBoard
        self.tiles = normalized.enumerated().map { offset, character in
            SpatialTile(
                index: offset,
                letter: String(character),
                position: SpatialPosition(
                    x: Double(offset) * 72,
                    y: offset.isMultiple(of: 2) ? 0 : 36,
                    z: Double(offset) * 8
                )
            )
        }
    }
}

public struct WordBridgeProgress: Codable, Equatable, Sendable {
    public var completedSessions: Int
    public var currentStreak: Int
    public var bestScores: [WordBridgeGame: Int]
    public var achievements: Set<String>
    public var lastDailyCompletionDate: Date?

    public init(
        completedSessions: Int = 0,
        currentStreak: Int = 0,
        bestScores: [WordBridgeGame: Int] = [:],
        achievements: Set<String> = [],
        lastDailyCompletionDate: Date? = nil
    ) {
        self.completedSessions = completedSessions
        self.currentStreak = currentStreak
        self.bestScores = bestScores
        self.achievements = achievements
        self.lastDailyCompletionDate = lastDailyCompletionDate
    }
}

public struct GameCompletion: Codable, Equatable, Sendable {
    public let game: WordBridgeGame
    public let score: Int
    public let completedAt: Date

    public init(game: WordBridgeGame, score: Int, completedAt: Date) {
        self.game = game
        self.score = score
        self.completedAt = completedAt
    }
}

public final class ProgressEngine {
    private let calendar: Calendar

    public init(calendar: Calendar = .current) {
        self.calendar = calendar
    }

    public func applying(_ completion: GameCompletion, to progress: WordBridgeProgress) -> WordBridgeProgress {
        var next = progress
        next.completedSessions += 1

        let previousBest = next.bestScores[completion.game] ?? 0
        next.bestScores[completion.game] = max(previousBest, completion.score)

        if next.completedSessions == 1 {
            next.achievements.insert("first_game")
        }

        switch completion.game {
        case .wordUnscrambler:
            next.achievements.insert("unscrambler_started")
        case .anagramRush:
            next.achievements.insert("rush_rookie")
            if completion.score >= 75 {
                next.achievements.insert("rush_scorer")
            }
        case .dailyScramble:
            next.achievements.insert("daily_started")
            updateDailyStreak(completedAt: completion.completedAt, progress: &next)
        case .spellingBee:
            next.achievements.insert("bee_beginner")
        case .guessTheWord:
            next.achievements.insert("first_guess")
        }

        if next.currentStreak >= 2 {
            next.achievements.insert("two_day_streak")
        }

        if next.completedSessions >= 5 {
            next.achievements.insert("five_sessions")
        }

        return next
    }

    private func updateDailyStreak(completedAt: Date, progress: inout WordBridgeProgress) {
        let completedDay = calendar.startOfDay(for: completedAt)

        guard let lastDate = progress.lastDailyCompletionDate else {
            progress.currentStreak = 1
            progress.lastDailyCompletionDate = completedDay
            return
        }

        let lastDay = calendar.startOfDay(for: lastDate)
        if calendar.isDate(completedDay, inSameDayAs: lastDay) {
            progress.lastDailyCompletionDate = completedDay
            return
        }

        if let nextDay = calendar.date(byAdding: .day, value: 1, to: lastDay),
           calendar.isDate(completedDay, inSameDayAs: nextDay) {
            progress.currentStreak += 1
        } else {
            progress.currentStreak = 1
        }

        progress.lastDailyCompletionDate = completedDay
    }
}

public protocol ProgressStore {
    func load() throws -> WordBridgeProgress
    func save(_ progress: WordBridgeProgress) throws
}

public final class FileProgressStore: ProgressStore {
    private let fileURL: URL
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    public init(fileURL: URL) {
        self.fileURL = fileURL
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    }

    public func load() throws -> WordBridgeProgress {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return WordBridgeProgress()
        }

        let data = try Data(contentsOf: fileURL)
        return try decoder.decode(WordBridgeProgress.self, from: data)
    }

    public func save(_ progress: WordBridgeProgress) throws {
        let directory = fileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let data = try encoder.encode(progress)
        try data.write(to: fileURL, options: [.atomic])
    }
}

public struct WordResult: Equatable, Sendable, Identifiable {
    public var id: String { word }
    public let word: String
    public let score: Int
}

public struct WordUnscramblerGame {
    private let dictionary: WordDictionary

    public init(dictionary: WordDictionary) {
        self.dictionary = dictionary
    }

    public func results(for letters: String) -> [WordResult] {
        let normalized = normalizeLetters(letters)

        return dictionary.solve(normalized)
            .map { WordResult(word: $0, score: scrabbleScore($0)) }
            .sorted { lhs, rhs in
                if lhs.word == normalized { return true }
                if rhs.word == normalized { return false }
                if lhs.word.count != rhs.word.count { return lhs.word.count > rhs.word.count }
                if lhs.score != rhs.score { return lhs.score > rhs.score }
                return lhs.word < rhs.word
            }
    }
}

public enum WordSubmissionResult: Equatable, Sendable {
    case accepted(score: Int)
    case duplicate
    case invalid
}

public struct AnagramRushGame {
    private let validWords: Set<String>
    private var acceptedWords: Set<String> = []
    public private(set) var totalScore: Int = 0

    public init(dictionary: WordDictionary, rack: String) {
        self.validWords = Set(dictionary.solve(rack))
    }

    public mutating func submit(_ word: String) -> WordSubmissionResult {
        let normalized = normalizeLetters(word)
        guard validWords.contains(normalized), normalized.count >= 3 else {
            return .invalid
        }

        guard !acceptedWords.contains(normalized) else {
            return .duplicate
        }

        acceptedWords.insert(normalized)
        let score = scrabbleScore(normalized) + normalized.count
        totalScore += score
        return .accepted(score: score)
    }
}

public struct DailyScrambleGame {
    private let dictionaryWords: Set<String>
    public let letters: String
    public let requiredLetter: Character
    public let puzzleWord: String

    public init(dictionary: WordDictionary, date: Date, calendar: Calendar = .current) {
        self.dictionaryWords = Set(dictionary.words.map { $0.uppercased() })

        let candidates = dictionary.words
            .map { normalizeLetters($0) }
            .filter { $0.count >= 5 && Set($0).count >= 4 }
            .sorted()
        let day = calendar.ordinality(of: .day, in: .era, for: date) ?? 0
        let seedWord = candidates.isEmpty ? "APPLE" : candidates[day % candidates.count]
        self.puzzleWord = seedWord
        self.letters = String(Set(seedWord).sorted())
        self.requiredLetter = seedWord.first ?? "A"
    }

    public func accepts(_ word: String) -> Bool {
        let normalized = normalizeLetters(word)
        guard normalized.count >= 4 else { return false }
        guard normalized.contains(requiredLetter) else { return false }
        guard dictionaryWords.contains(normalized) else { return false }

        let availableLetters = Set(letters)
        return normalized.allSatisfy { availableLetters.contains($0) }
    }
}

public struct SpellingBeeGame {
    private let dictionaryWords: Set<String>
    private let availableLetters: Set<Character>
    private let required: Character

    public init(dictionary: WordDictionary, letters: String, requiredLetter: Character) {
        self.dictionaryWords = Set(dictionary.words.map { $0.uppercased() })
        self.availableLetters = Set(normalizeLetters(letters))
        self.required = Character(normalizeLetters(String(requiredLetter)).first.map(String.init) ?? "A")
    }

    public func accepts(_ word: String) -> Bool {
        let normalized = normalizeLetters(word)
        guard normalized.count >= 4 else { return false }
        guard normalized.contains(required) else { return false }
        guard dictionaryWords.contains(normalized) else { return false }
        return normalized.allSatisfy { availableLetters.contains($0) }
    }

    public func score(_ word: String) -> Int {
        let normalized = normalizeLetters(word)
        guard normalized.count >= 4 else { return 0 }

        var total = normalized.count
        if Set(normalized).isSuperset(of: availableLetters) {
            total += 7
        }
        return total
    }
}

public enum GuessMark: Equatable, Sendable {
    case correct
    case present
    case absent
}

public struct GuessTheWordGame {
    private let dictionaryWords: Set<String>
    private let target: String

    public init(dictionary: WordDictionary, target: String) {
        self.dictionaryWords = Set(dictionary.words.map { $0.uppercased() })
        self.target = normalizeLetters(target)
    }

    public func evaluate(_ guess: String) -> [GuessMark] {
        let normalized = normalizeLetters(guess)
        let targetCharacters = Array(target)
        return Array(normalized).enumerated().map { index, character in
            guard index < targetCharacters.count else { return .absent }
            if targetCharacters[index] == character {
                return .correct
            }
            if targetCharacters.contains(character) {
                return .present
            }
            return .absent
        }
    }

    public func isValidGuess(_ guess: String) -> Bool {
        let normalized = normalizeLetters(guess)
        return normalized.count == target.count && dictionaryWords.contains(normalized)
    }
}

public struct ShareCard: Equatable, Sendable {
    public let title: String
    public let body: String
}

public enum ShareCardFactory {
    public static func card(for completion: GameCompletion, progress: WordBridgeProgress) -> ShareCard {
        let streakCopy = progress.currentStreak == 1
            ? "1-day streak"
            : "\(progress.currentStreak)-day streak"

        return ShareCard(
            title: "WordBridge \(completion.game.title)",
            body: "I scored \(completion.score) in \(completion.game.title) and kept a \(streakCopy). Play WordBridge."
        )
    }
}

@MainActor
public protocol DailyReminderScheduling: AnyObject {
    func scheduleDailyPuzzleReminder(hour: Int, minute: Int) async throws
}

public final class LocalNotificationReminderScheduler: DailyReminderScheduling {
    private let center: UNUserNotificationCenter

    public init(center: UNUserNotificationCenter = .current()) {
        self.center = center
    }

    public func scheduleDailyPuzzleReminder(hour: Int, minute: Int) async throws {
        let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
        guard granted else { return }

        let content = UNMutableNotificationContent()
        content.title = "Daily Scramble is ready"
        content.body = "Keep your WordBridge streak going."
        content.sound = .default

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(
            identifier: "wordbridge.daily-scramble",
            content: content,
            trigger: trigger
        )

        try await center.add(request)
    }
}

@MainActor
public final class WordBridgeViewModel: ObservableObject {
    @Published public private(set) var progress: WordBridgeProgress
    public let games: [WordBridgeGame]
    public let todayTitle = "Today"
    private let progressStore: ProgressStore?
    private let progressEngine: ProgressEngine
    private let reminderScheduler: DailyReminderScheduling?
    private let analyticsRecorder: AnalyticsRecording?

    public init(
        progress: WordBridgeProgress = WordBridgeProgress(),
        progressStore: ProgressStore? = nil,
        progressEngine: ProgressEngine = ProgressEngine(),
        reminderScheduler: DailyReminderScheduling? = nil,
        analyticsRecorder: AnalyticsRecording? = nil
    ) {
        self.progress = progress
        self.progressStore = progressStore
        self.progressEngine = progressEngine
        self.reminderScheduler = reminderScheduler
        self.analyticsRecorder = analyticsRecorder
        self.games = WordBridgeCatalog.v1Games
    }

    public func complete(_ completion: GameCompletion) throws {
        progress = progressEngine.applying(completion, to: progress)
        try progressStore?.save(progress)
        analyticsRecorder?.record(
            AnalyticsEvent(
                name: completion.analyticsEventName,
                occurredAt: completion.completedAt,
                properties: [
                    .game: completion.game.title,
                    .scoreBucket: Self.scoreBucket(for: completion.score)
                ]
            )
        )
    }

    public func shareCard(for completion: GameCompletion) -> ShareCard {
        analyticsRecorder?.record(
            AnalyticsEvent(
                name: .shareCardCreated,
                occurredAt: Date(),
                properties: [.game: completion.game.title]
            )
        )
        return ShareCardFactory.card(for: completion, progress: progress)
    }

    public func scheduleDailyReminder(hour: Int = 9, minute: Int = 0) async throws {
        try await reminderScheduler?.scheduleDailyPuzzleReminder(hour: hour, minute: minute)
    }

    private static func scoreBucket(for score: Int) -> String {
        let lowerBound = max(0, score / 10 * 10)
        return "\(lowerBound)-\(lowerBound + 9)"
    }
}

private extension GameCompletion {
    var analyticsEventName: AnalyticsEventName {
        switch game {
        case .anagramRush:
            .rushRoundCompleted
        case .dailyScramble:
            .dailyCompleted
        default:
            .sessionStarted
        }
    }
}

public struct WordBridgeRootView: View {
    @StateObject private var viewModel: WordBridgeViewModel

    @MainActor
    public init(viewModel: WordBridgeViewModel = WordBridgeViewModel()) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    public var body: some View {
        NavigationStack {
            TodayView(viewModel: viewModel)
        }
    }
}

public struct WordBridgeUniversalRootView: View {
    @StateObject private var viewModel: WordBridgeViewModel
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @MainActor
    public init(viewModel: WordBridgeViewModel = WordBridgeViewModel()) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    public var body: some View {
        #if os(iOS)
        if horizontalSizeClass == .regular {
            IPadDashboardView(model: IPadDashboardModel(progress: viewModel.progress))
        } else {
            WordBridgeRootView(viewModel: viewModel)
        }
        #else
        WordBridgeRootView(viewModel: viewModel)
        #endif
    }
}

public struct TodayView: View {
    @ObservedObject private var viewModel: WordBridgeViewModel

    public init(viewModel: WordBridgeViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("WordBridge")
                        .font(.largeTitle.bold())
                    Text("\(viewModel.progress.currentStreak)-day streak")
                        .foregroundStyle(.secondary)
                    Text("\(viewModel.progress.completedSessions) sessions completed")
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 8)
            }

            Section("Play") {
                ForEach(viewModel.games) { game in
                    NavigationLink(value: game) {
                        Label(game.title, systemImage: game.systemImage)
                    }
                }
            }

            if !viewModel.progress.bestScores.isEmpty {
                Section("Best Scores") {
                    ForEach(
                        viewModel.progress.bestScores
                            .sorted { $0.key.title < $1.key.title },
                        id: \.key
                    ) { game, score in
                        HStack {
                            Text(game.title)
                            Spacer()
                            Text("\(score)")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            if !viewModel.progress.achievements.isEmpty {
                Section("Achievements") {
                    ForEach(viewModel.progress.achievements.sorted(), id: \.self) { achievement in
                        Label(achievement.replacingOccurrences(of: "_", with: " "), systemImage: "rosette")
                    }
                }
            }

            Section("Reminder") {
                Button {
                    Task {
                        try? await viewModel.scheduleDailyReminder()
                    }
                } label: {
                    Label("Daily puzzle reminder", systemImage: "bell")
                }
            }

            Section("V1 Promise") {
                Label("Offline play", systemImage: "wifi.slash")
                Label("No ads", systemImage: "hand.raised")
                Label("No login or payments", systemImage: "person.crop.circle.badge.xmark")
            }
        }
        .navigationTitle(viewModel.todayTitle)
        .navigationDestination(for: WordBridgeGame.self) { game in
            GameRouteView(game: game)
        }
    }
}

public struct GameRouteView: View {
    private let game: WordBridgeGame

    public init(game: WordBridgeGame) {
        self.game = game
    }

    public var body: some View {
        Group {
            switch game {
            case .wordUnscrambler:
                WordUnscramblerScreen()
            case .anagramRush:
                AnagramRushScreen()
            case .dailyScramble:
                DailyScrambleScreen()
            case .spellingBee:
                SpellingBeeScreen()
            case .guessTheWord:
                GuessTheWordScreen()
            }
        }
        .navigationTitle(game.title)
    }
}

public struct IPadDashboardView: View {
    private let model: IPadDashboardModel

    public init(model: IPadDashboardModel) {
        self.model = model
    }

    public var body: some View {
        NavigationSplitView {
            List(WordBridgeCatalog.v1Games) { game in
                Label(game.title, systemImage: game.systemImage)
            }
            .navigationTitle("Games")
        } detail: {
            VStack(alignment: .leading, spacing: 16) {
                Text(model.selectedGame.title)
                    .font(.largeTitle.bold())
                Text(model.statsSummary)
                    .foregroundStyle(.secondary)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160))]) {
                    ForEach(model.stats) { stat in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(stat.game.title)
                                .font(.headline)
                            Text("Best \(stat.bestScore)")
                                .font(.title3.bold())
                            Text("\(stat.sessions) sessions")
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                        .background(.thinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
            .padding()
            .navigationTitle("Dashboard")
        }
    }
}

public struct MacDashboardView: View {
    private let model: MacDashboardModel

    public init(model: MacDashboardModel) {
        self.model = model
    }

    public var body: some View {
        NavigationSplitView {
            List(WordBridgeCatalog.v1Games) { game in
                Label(game.title, systemImage: game.systemImage)
            }
            .navigationTitle("WordBridge")
        } detail: {
            VStack(alignment: .leading, spacing: 20) {
                Text("Keyboard Dashboard")
                    .font(.largeTitle.bold())
                Text("\(model.defaultSessionMinutes)-minute focus sessions")
                    .foregroundStyle(.secondary)

                Section("Shortcuts") {
                    ForEach(model.shortcuts, id: \.self) { shortcut in
                        HStack {
                            Text(shortcut.action)
                            Spacer()
                            Text((shortcut.modifiers.map(\.rawValue) + [shortcut.key]).joined(separator: " + "))
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section("History") {
                    if model.history.isEmpty {
                        Text("No completed sessions yet.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(Array(model.history.enumerated()), id: \.offset) { _, completion in
                            HStack {
                                Text(completion.game.title)
                                Spacer()
                                Text("\(completion.score)")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .padding()
        }
    }
}

public struct WatchCompanionView: View {
    private let model: WatchCompanionModel

    public init(model: WatchCompanionModel) {
        self.model = model
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("WordBridge")
                .font(.headline)
            Text(model.streakText)
                .font(.title3.bold())
            Text(model.completionStatus == .complete ? "Daily complete" : "Daily open")
            Text(model.reminderTitle)
                .foregroundStyle(.secondary)
        }
    }
}

public struct TVPartyModeView: View {
    private let model: TVPartyModeModel

    public init(model: TVPartyModeModel = TVPartyModeModel()) {
        self.model = model
    }

    public var body: some View {
        VStack(spacing: 32) {
            Text(model.largeScreenPrompt)
                .font(.largeTitle.bold())
            Text("\(model.roundSeconds)-second rounds")
                .font(.title)
            HStack(spacing: 48) {
                ForEach(model.supportedGames) { game in
                    Label(game.title, systemImage: game.systemImage)
                        .font(.title2.bold())
                }
            }
        }
        .padding(80)
    }
}

public struct VisionSpatialTileBoardView: View {
    private let concept: VisionSpatialTileBoardConcept

    public init(concept: VisionSpatialTileBoardConcept) {
        self.concept = concept
    }

    public var body: some View {
        ZStack {
            ForEach(concept.tiles) { tile in
                Text(tile.letter)
                    .font(.largeTitle.bold())
                    .frame(width: 64, height: 64)
                    .background(.thinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .offset(x: tile.position.x, y: tile.position.y)
                    .shadow(radius: tile.position.z / 8)
            }
        }
        .padding()
    }
}

public struct AppleEcosystemRootView: View {
    private let role: AppleDeviceRole
    @StateObject private var viewModel: WordBridgeViewModel

    @MainActor
    public init(role: AppleDeviceRole, viewModel: WordBridgeViewModel = WordBridgeViewModel()) {
        self.role = role
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    public var body: some View {
        switch role {
        case .iPad:
            IPadDashboardView(model: IPadDashboardModel(progress: viewModel.progress))
        case .mac:
            MacDashboardView(model: MacDashboardModel())
        case .watch:
            WatchCompanionView(
                model: WatchCompanionModel(
                    progress: viewModel.progress,
                    isDailyComplete: false
                )
            )
        case .tv:
            TVPartyModeView()
        case .vision:
            VisionSpatialTileBoardView(concept: VisionSpatialTileBoardConcept(letters: "BRIDGE"))
        }
    }
}

public struct WordUnscramblerScreen: View {
    @State private var letters = ""
    private let game = WordUnscramblerGame(dictionary: WordBridgePreviewData.dictionary())

    public init() {}

    public var body: some View {
        let results = game.results(for: letters)

        Form {
            TextField("Letters", text: $letters)
                .wordBridgeCharacterInput()

            if results.isEmpty {
                Text("No words found yet.")
                    .foregroundStyle(.secondary)
            } else {
                Section("Results") {
                    ForEach(results.prefix(40)) { result in
                        HStack {
                            Text(result.word)
                            Spacer()
                            Text("\(result.score)")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }
}

public struct AnagramRushScreen: View {
    @State private var entry = ""
    @State private var game = AnagramRushGame(
        dictionary: WordBridgePreviewData.dictionary(),
        rack: "PLEA"
    )
    @State private var message = "Rack: PLEA"

    public init() {}

    public var body: some View {
        Form {
            Text("90 seconds")
                .font(.title.bold())
            Text(message)
                .foregroundStyle(.secondary)
            Text("Score: \(game.totalScore)")
            TextField("Enter a word", text: $entry)
                .wordBridgeCharacterInput()
            Button("Submit") {
                let result = game.submit(entry)
                switch result {
                case .accepted(let score):
                    message = "+\(score)"
                case .duplicate:
                    message = "Already found"
                case .invalid:
                    message = "Not in this rack"
                }
                entry = ""
            }
        }
    }
}

public struct DailyScrambleScreen: View {
    @State private var entry = ""
    @State private var foundWords: [String] = []
    @State private var message = ""
    private let game = DailyScrambleGame(
        dictionary: WordBridgePreviewData.dictionary(),
        date: Date()
    )

    public init() {}

    public var body: some View {
        Form {
            Text("Daily Scramble")
                .font(.title.bold())
            Text("Letters: \(game.letters)")
            Text("Required: \(String(game.requiredLetter))")
                .foregroundStyle(.secondary)
            TextField("Word", text: $entry)
                .wordBridgeCharacterInput()
            Button("Check") {
                let normalized = normalizeLetters(entry)
                if game.accepts(normalized), !foundWords.contains(normalized) {
                    foundWords.append(normalized)
                    message = "Accepted"
                } else {
                    message = "Try another word"
                }
                entry = ""
            }
            Text(message)
                .foregroundStyle(.secondary)
            if !foundWords.isEmpty {
                Section("Found") {
                    ForEach(foundWords, id: \.self) { word in
                        Text(word)
                    }
                }
            }
            ShareLink(item: "I found \(foundWords.count) words in today's WordBridge Daily Scramble.")
        }
    }
}

public struct SpellingBeeScreen: View {
    @State private var entry = ""
    @State private var score = 0
    @State private var message = "Use P in every word."
    private let game = SpellingBeeGame(
        dictionary: WordBridgePreviewData.dictionary(),
        letters: "PLEARDX",
        requiredLetter: "P"
    )

    public init() {}

    public var body: some View {
        Form {
            Text("Spelling Bee")
                .font(.title.bold())
            Text("Letters: P L E A R D X")
            Text("Score: \(score)")
            TextField("Word", text: $entry)
                .wordBridgeCharacterInput()
            Button("Check") {
                let normalized = normalizeLetters(entry)
                if game.accepts(normalized) {
                    let earned = game.score(normalized)
                    score += earned
                    message = "+\(earned)"
                } else {
                    message = "Not valid"
                }
                entry = ""
            }
            Text(message)
                .foregroundStyle(.secondary)
        }
    }
}

public struct GuessTheWordScreen: View {
    @State private var guess = ""
    @State private var rows: [(String, [GuessMark])] = []
    @State private var message = "Five letters"
    private let game = GuessTheWordGame(
        dictionary: WordBridgePreviewData.dictionary(),
        target: "STONE"
    )

    public init() {}

    public var body: some View {
        Form {
            Text("Guess the Word")
                .font(.title.bold())
            TextField("Guess", text: $guess)
                .wordBridgeCharacterInput()
            Button("Submit Guess") {
                let normalized = normalizeLetters(guess)
                if game.isValidGuess(normalized) {
                    rows.append((normalized, game.evaluate(normalized)))
                    message = normalized == "STONE" ? "Solved" : "Keep going"
                } else {
                    message = "Not in dictionary"
                }
                guess = ""
            }
            Text(message)
                .foregroundStyle(.secondary)
            ForEach(rows, id: \.0) { row in
                HStack {
                    Text(row.0)
                    Spacer()
                    Text(row.1.map(\.symbol).joined())
                        .accessibilityLabel(row.1.map(\.accessibilityLabel).joined(separator: ", "))
                }
            }
        }
    }
}

public struct WordBridgeAppScene: App {
    public init() {}

    public var body: some Scene {
        WindowGroup {
            WordBridgeUniversalRootView()
        }
    }
}

private extension View {
    @ViewBuilder
    func wordBridgeCharacterInput() -> some View {
        #if os(iOS)
        textInputAutocapitalization(.characters)
        #else
        self
        #endif
    }
}

private extension GuessMark {
    var symbol: String {
        switch self {
        case .correct:
            "C"
        case .present:
            "P"
        case .absent:
            "-"
        }
    }

    var accessibilityLabel: String {
        switch self {
        case .correct:
            "correct"
        case .present:
            "present"
        case .absent:
            "absent"
        }
    }
}

private enum WordBridgePreviewData {
    static func dictionary() -> WordDictionary {
        if let bundled = try? WordDictionary.bundled() {
            return bundled
        }

        return WordDictionary(words: [
            "ace", "act", "cat", "dog", "apple", "pea", "ape", "plea", "peal",
            "leap", "pale", "pear", "read", "dear", "dare", "stone", "tones"
        ])
    }
}
