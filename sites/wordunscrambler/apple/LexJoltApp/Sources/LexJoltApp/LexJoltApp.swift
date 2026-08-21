import Foundation
import SwiftUI
@preconcurrency import UserNotifications
import WordGameCore

public enum LexJoltGame: String, CaseIterable, Codable, Equatable, Hashable, Identifiable, Sendable {
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
            "Daily Jolt"
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

public enum LexJoltCatalog {
    public static let v1Games: [LexJoltGame] = [
        .wordUnscrambler,
        .anagramRush,
        .dailyScramble,
        .spellingBee,
        .guessTheWord
    ]
}

public enum LexJoltPolicy {
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
        !LexJoltPolicy.hasAds
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
        bundleIdentifier: "com.lexjolt.app",
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
    public let supportedGames: [LexJoltGame]
    public let features: [String]
}

public enum LexJoltEcosystem {
    public static let phase3Experiences: [DeviceExperience] = [
        .init(
            role: .iPad,
            title: "iPad dashboard",
            primaryPattern: .splitViewDashboard,
            supportedGames: LexJoltCatalog.v1Games,
            features: ["split view", "larger boards", "stats"]
        ),
        .init(
            role: .mac,
            title: "Mac command center",
            primaryPattern: .keyboardDashboard,
            supportedGames: LexJoltCatalog.v1Games,
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
    public var id: LexJoltGame { game }
    public let game: LexJoltGame
    public let bestScore: Int
    public let sessions: Int
}

public struct IPadDashboardModel: Codable, Equatable, Sendable {
    public let layout: DashboardLayout
    public let boardSize: BoardSize
    public let selectedGame: LexJoltGame
    public let stats: [GameStat]
    public let statsSummary: String

    public init(progress: LexJoltProgress, selectedGame: LexJoltGame = .dailyScramble) {
        self.layout = .splitView
        self.boardSize = .large
        self.selectedGame = selectedGame
        self.stats = LexJoltCatalog.v1Games.map { game in
            GameStat(
                game: game,
                bestScore: progress.bestScores[game] ?? 0,
                sessions: progress.completedSessions
            )
        }
        self.statsSummary = "\(progress.completedSessions) sessions, \(progress.currentStreak)-day streak"
    }
}

public enum LexJoltKeyModifier: String, Codable, Equatable, Hashable, Sendable {
    case command
    case shift
    case option
    case control
}

public struct KeyboardShortcutSpec: Codable, Equatable, Hashable, Sendable {
    public let key: String
    public let modifiers: [LexJoltKeyModifier]
    public let action: String

    public init(key: String, modifiers: [LexJoltKeyModifier], action: String) {
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
    public let streakCount: Int
    public let streakText: String
    public let reminderTitle: String
    public let completionStatus: DailyCompletionStatus
    public let isDailyComplete: Bool
    public let sessionsText: String

    public init(progress: LexJoltProgress, isDailyComplete: Bool) {
        self.streakCount = progress.currentStreak
        self.streakText = progress.currentStreak == 1
            ? "1-day streak"
            : "\(progress.currentStreak)-day streak"
        self.reminderTitle = "Daily Jolt"
        self.completionStatus = isDailyComplete ? .complete : .notComplete
        self.isDailyComplete = isDailyComplete
        self.sessionsText = "\(progress.completedSessions) sessions"
    }
}

public enum TVInputMode: String, Codable, Equatable, Sendable {
    case remoteFriendly
}

public struct TVPartyModeModel: Codable, Equatable, Sendable {
    public let supportedGames: [LexJoltGame]
    public let roundSeconds: Int
    public let inputMode: TVInputMode
    public let largeScreenPrompt: String
    public var primaryActionTitle: String { "Start \(roundSeconds)-second round" }

    public init(roundSeconds: Int = 90) {
        self.supportedGames = [.guessTheWord, .anagramRush]
        self.roundSeconds = roundSeconds
        self.inputMode = .remoteFriendly
        self.largeScreenPrompt = "LexJolt party round"
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

public struct LexJoltProgress: Codable, Equatable, Sendable {
    public var completedSessions: Int
    public var currentStreak: Int
    public var bestScores: [LexJoltGame: Int]
    public var achievements: Set<String>
    public var lastDailyCompletionDate: Date?

    public init(
        completedSessions: Int = 0,
        currentStreak: Int = 0,
        bestScores: [LexJoltGame: Int] = [:],
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
    public let game: LexJoltGame
    public let score: Int
    public let completedAt: Date

    public init(game: LexJoltGame, score: Int, completedAt: Date) {
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

    public func applying(_ completion: GameCompletion, to progress: LexJoltProgress) -> LexJoltProgress {
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

    private func updateDailyStreak(completedAt: Date, progress: inout LexJoltProgress) {
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
    func load() throws -> LexJoltProgress
    func save(_ progress: LexJoltProgress) throws
}

public final class FileProgressStore: ProgressStore {
    private let fileURL: URL
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    public init(fileURL: URL) {
        self.fileURL = fileURL
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    }

    public func load() throws -> LexJoltProgress {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return LexJoltProgress()
        }

        let data = try Data(contentsOf: fileURL)
        return try decoder.decode(LexJoltProgress.self, from: data)
    }

    public func save(_ progress: LexJoltProgress) throws {
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
    public static func card(for completion: GameCompletion, progress: LexJoltProgress) -> ShareCard {
        let streakCopy = progress.currentStreak == 1
            ? "1-day streak"
            : "\(progress.currentStreak)-day streak"

        return ShareCard(
            title: "LexJolt \(completion.game.title)",
            body: "I scored \(completion.score) in \(completion.game.title) and kept a \(streakCopy). Play LexJolt."
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
        #if os(tvOS)
        return
        #else
        let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
        guard granted else { return }

        let content = UNMutableNotificationContent()
        content.title = "Daily Jolt is ready"
        content.body = "Keep your LexJolt streak going."
        content.sound = .default

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(
            identifier: "lexjolt.daily-jolt",
            content: content,
            trigger: trigger
        )

        try await center.add(request)
        #endif
    }
}

@MainActor
public final class LexJoltViewModel: ObservableObject {
    @Published public private(set) var progress: LexJoltProgress
    public let games: [LexJoltGame]
    public let todayTitle = "Today"
    private let progressStore: ProgressStore?
    private let progressEngine: ProgressEngine
    private let reminderScheduler: DailyReminderScheduling?
    private let analyticsRecorder: AnalyticsRecording?

    public init(
        progress: LexJoltProgress = LexJoltProgress(),
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
        self.games = LexJoltCatalog.v1Games
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

public enum LexJoltTheme {
    public static let brandBlue = Color(red: 10 / 255, green: 102 / 255, blue: 194 / 255)
    public static let navy = Color(red: 0, green: 65 / 255, blue: 130 / 255)
    public static let sky = Color(red: 112 / 255, green: 181 / 255, blue: 249 / 255)
    public static let paleBlue = Color(red: 215 / 255, green: 235 / 255, blue: 1)

    public static func accent(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? sky : brandBlue
    }
}

public struct LexJoltBrandMark: View {
    private let size: CGFloat

    public init(size: CGFloat = 72) {
        self.size = size
    }

    public var body: some View {
        ZStack {
            brandTile("L", x: 0.22, y: 0.23, fill: .white)
            brandTile("E", x: 0.76, y: 0.18, fill: LexJoltTheme.paleBlue)
            brandTile("X", x: 0.18, y: 0.77, fill: LexJoltTheme.sky.opacity(0.72))
            brandTile("J", x: 0.78, y: 0.75, fill: .white)

            Image(systemName: "bolt.fill")
                .resizable()
                .scaledToFit()
                .foregroundStyle(LexJoltTheme.navy)
                .frame(width: size * 0.22, height: size * 0.34)
                .rotationEffect(.degrees(8))
        }
        .frame(width: size, height: size)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("LexJolt")
    }

    private func brandTile(_ letter: String, x: CGFloat, y: CGFloat, fill: Color) -> some View {
        Text(letter)
            .font(.system(size: size * 0.18, weight: .black, design: .rounded))
            .foregroundStyle(LexJoltTheme.navy)
            .frame(width: size * 0.38, height: size * 0.38)
            .background(fill)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.075))
            .overlay {
                RoundedRectangle(cornerRadius: size * 0.075)
                    .stroke(LexJoltTheme.navy, lineWidth: max(2, size * 0.025))
            }
            .position(x: size * x, y: size * y)
    }
}

public struct LexJoltSplashView: View {
    @State private var isEnergized = false

    public init() {}

    public var body: some View {
        ZStack {
            LexJoltTheme.brandBlue
                .ignoresSafeArea()

            VStack(spacing: 24) {
                LexJoltBrandMark(size: 168)
                    .scaleEffect(isEnergized ? 1 : 0.88)
                    .opacity(isEnergized ? 1 : 0.72)

                VStack(spacing: 8) {
                    Text("LexJolt")
                        .font(.system(size: 42, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Text("Find it. Learn it. Play it.")
                        .font(.headline)
                        .foregroundStyle(LexJoltTheme.paleBlue)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("lexjolt.splash")
        .onAppear {
            withAnimation(.spring(response: 0.55, dampingFraction: 0.72)) {
                isEnergized = true
            }
        }
    }
}

public struct LexJoltRootView: View {
    @StateObject private var viewModel: LexJoltViewModel
    @Environment(\.colorScheme) private var colorScheme

    @MainActor
    public init(
        viewModel: LexJoltViewModel = LexJoltViewModel(
            reminderScheduler: LocalNotificationReminderScheduler()
        )
    ) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    public var body: some View {
        NavigationStack {
            TodayView(viewModel: viewModel)
        }
        .tint(LexJoltTheme.accent(for: colorScheme))
    }
}

public struct LexJoltUniversalRootView: View {
    @StateObject private var viewModel: LexJoltViewModel
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @MainActor
    public init(
        viewModel: LexJoltViewModel = LexJoltViewModel(
            reminderScheduler: LocalNotificationReminderScheduler()
        )
    ) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    public var body: some View {
        #if os(iOS)
        if horizontalSizeClass == .regular {
            IPadDashboardView(viewModel: viewModel)
        } else {
            LexJoltRootView(viewModel: viewModel)
        }
        #else
        LexJoltRootView(viewModel: viewModel)
        #endif
    }
}

public struct TodayView: View {
    @ObservedObject private var viewModel: LexJoltViewModel
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    public init(viewModel: LexJoltViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 16) {
                    LexJoltBrandMark(size: 76)
                        .padding(8)
                        .background(LexJoltTheme.brandBlue)
                        .clipShape(RoundedRectangle(cornerRadius: 8))

                    VStack(alignment: .leading, spacing: 4) {
                        Text("LexJolt")
                            .font(.largeTitle.bold())
                        Text(viewModel.todayTitle)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.secondary)
                    }
                }

                statusPanel
                .padding(.vertical, 14)
                .background(LexJoltTheme.paleBlue.opacity(0.5))
                .clipShape(RoundedRectangle(cornerRadius: 8))

                Text("Play")
                    .font(.title2.bold())

                ForEach(viewModel.games) { game in
                    NavigationLink(value: game) {
                        gameRow(game)
                        .frame(minHeight: 56)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.secondary.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("game.\(game.rawValue)")
                }

                if !viewModel.progress.bestScores.isEmpty {
                    Text("Best Scores")
                        .font(.title2.bold())
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

                Button {
                    Task {
                        try? await viewModel.scheduleDailyReminder()
                    }
                } label: {
                    Label("Daily puzzle reminder", systemImage: "bell")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.bordered)
                .accessibilityIdentifier("daily.reminder")
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .frame(maxWidth: 720)
            .frame(maxWidth: .infinity)
        }
        .background(Color.secondary.opacity(0.035))
        .lexJoltInlineNavigationTitle()
        .accessibilityIdentifier("lexjolt.today")
        .navigationDestination(for: LexJoltGame.self) { game in
            GameRouteView(game: game)
        }
    }

    @ViewBuilder
    private var statusPanel: some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 12) {
                statusMetric(value: "\(viewModel.progress.currentStreak)", label: "Day streak")
                Divider()
                statusMetric(value: "\(viewModel.progress.completedSessions)", label: "Sessions")
                Divider()
                statusMetric(value: "\(viewModel.progress.achievements.count)", label: "Badges")
            }
            .padding(.horizontal, 16)
        } else {
            HStack(spacing: 0) {
                statusMetric(value: "\(viewModel.progress.currentStreak)", label: "Day streak")
                Divider().frame(height: 44)
                statusMetric(value: "\(viewModel.progress.completedSessions)", label: "Sessions")
                Divider().frame(height: 44)
                statusMetric(value: "\(viewModel.progress.achievements.count)", label: "Badges")
            }
        }
    }

    @ViewBuilder
    private func gameRow(_ game: LexJoltGame) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    gameIcon(game)
                    Spacer()
                    disclosureIcon
                }
                gameTitle(game)
                    .fixedSize(horizontal: false, vertical: true)
            }
        } else {
            HStack(spacing: 14) {
                gameIcon(game)
                gameTitle(game)
                Spacer()
                disclosureIcon
            }
        }
    }

    private func gameIcon(_ game: LexJoltGame) -> some View {
        Image(systemName: game.systemImage)
            .font(.title3.weight(.semibold))
            .foregroundStyle(.white)
            .frame(width: 44, height: 44)
            .background(LexJoltTheme.brandBlue)
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func gameTitle(_ game: LexJoltGame) -> some View {
        Text(game.title)
            .font(.headline)
            .foregroundStyle(.primary)
    }

    private var disclosureIcon: some View {
        Image(systemName: "chevron.right")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.tertiary)
    }

    @ViewBuilder
    private func statusMetric(value: String, label: String) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text(value)
                    .font(.title3.bold())
                    .foregroundStyle(LexJoltTheme.accent(for: colorScheme))
                    .frame(minWidth: 36, alignment: .trailing)
                Text(label)
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
        } else {
            VStack(spacing: 3) {
                Text(value)
                    .font(.title3.bold())
                    .foregroundStyle(LexJoltTheme.accent(for: colorScheme))
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .accessibilityElement(children: .combine)
        }
    }
}

public struct GameRouteView: View {
    private let game: LexJoltGame

    public init(game: LexJoltGame) {
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
    @ObservedObject private var viewModel: LexJoltViewModel
    @State private var selectedGame: LexJoltGame = .dailyScramble
    @Environment(\.colorScheme) private var colorScheme

    public init(viewModel: LexJoltViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationSplitView {
            List {
                Section {
                    HStack(spacing: 12) {
                        LexJoltBrandMark(size: 54)
                            .padding(6)
                            .background(LexJoltTheme.brandBlue)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        Text("LexJolt")
                            .font(.title2.bold())
                    }
                }

                Section("Games") {
                    ForEach(LexJoltCatalog.v1Games) { game in
                        Button {
                            selectedGame = game
                        } label: {
                            Label(game.title, systemImage: game.systemImage)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(selectedGame == game ? LexJoltTheme.paleBlue : Color.clear)
                        .accessibilityIdentifier("game.\(game.rawValue)")
                    }
                }
            }
            .navigationTitle("Play")
        } detail: {
            NavigationStack {
                GameRouteView(game: selectedGame)
            }
        }
        .tint(LexJoltTheme.accent(for: colorScheme))
        .accessibilityIdentifier("lexjolt.ipad")
    }
}

public struct MacDashboardView: View {
    private let model: MacDashboardModel
    @State private var selectedGame: LexJoltGame?

    public init(model: MacDashboardModel) {
        self.model = model
        _selectedGame = State(initialValue: nil)
    }

    public var body: some View {
        NavigationSplitView {
            List {
                Section {
                    HStack(spacing: 12) {
                        LexJoltBrandMark(size: 46)
                            .padding(5)
                            .background(LexJoltTheme.brandBlue)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("LexJolt")
                                .font(.headline)
                            Text("Word games")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .accessibilityElement(children: .combine)
                }

                Section("Games") {
                    ForEach(LexJoltCatalog.v1Games) { game in
                        Button {
                            selectedGame = game
                        } label: {
                            Label(game.title, systemImage: game.systemImage)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(selectedGame == game ? LexJoltTheme.paleBlue : Color.clear)
                        .accessibilityIdentifier("game.\(game.rawValue)")
                    }
                }
            }
            .navigationTitle("LexJolt")
            .navigationSplitViewColumnWidth(min: 220, ideal: 240, max: 300)
        } detail: {
            NavigationStack {
                if let selectedGame {
                    GameRouteView(game: selectedGame)
                } else {
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
    }
}

public struct WatchCompanionView: View {
    private let model: WatchCompanionModel
    private let scheduleReminder: () async -> Bool
    @State private var reminderScheduled = false

    public init(
        model: WatchCompanionModel,
        scheduleReminder: @escaping () async -> Bool = { true }
    ) {
        self.model = model
        self.scheduleReminder = scheduleReminder
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                HStack(spacing: 8) {
                    LexJoltBrandMark(size: 34)
                        .padding(4)
                        .background(LexJoltTheme.brandBlue)
                        .clipShape(RoundedRectangle(cornerRadius: 7))
                    Text("LexJolt")
                        .font(.headline)
                    Spacer(minLength: 0)
                }

                ZStack {
                    Circle()
                        .stroke(Color.secondary.opacity(0.2), lineWidth: 8)
                    Circle()
                        .trim(from: 0, to: min(Double(model.streakCount) / 7, 1))
                        .stroke(
                            LexJoltTheme.sky,
                            style: StrokeStyle(lineWidth: 8, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                    VStack(spacing: 0) {
                        Text("\(model.streakCount)")
                            .font(.title2.bold())
                        Text("day streak")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(width: 96, height: 96)
                .accessibilityElement(children: .combine)
                .accessibilityLabel(model.streakText)

                HStack(spacing: 8) {
                    Image(systemName: model.isDailyComplete ? "checkmark.circle.fill" : "bolt.circle.fill")
                        .foregroundStyle(model.isDailyComplete ? Color.green : LexJoltTheme.sky)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(model.reminderTitle)
                            .font(.headline)
                        Text(model.isDailyComplete ? "Complete today" : "Ready to play")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 0)
                }
                .padding(10)
                .background(Color.secondary.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 8))

                Button {
                    Task {
                        reminderScheduled = await scheduleReminder()
                    }
                } label: {
                    Label(
                        reminderScheduled ? "Reminder on" : "Remind me",
                        systemImage: reminderScheduled ? "bell.fill" : "bell"
                    )
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(LexJoltTheme.brandBlue)
                .accessibilityIdentifier("watch.reminder")

                Text(model.sessionsText)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
        }
        .accessibilityIdentifier("lexjolt.watch")
    }
}

public struct TVPartyModeView: View {
    private let model: TVPartyModeModel
    @State private var selectedGame: LexJoltGame = .guessTheWord
    @State private var isRoundLive = false

    public init(model: TVPartyModeModel = TVPartyModeModel()) {
        self.model = model
    }

    public var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 42) {
                HStack(spacing: 24) {
                    LexJoltBrandMark(size: 112)
                        .padding(14)
                        .background(LexJoltTheme.brandBlue)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    VStack(alignment: .leading, spacing: 5) {
                        Text("LexJolt")
                            .font(.system(size: 64, weight: .black, design: .rounded))
                        Text("Party Mode")
                            .font(.title2)
                            .foregroundStyle(LexJoltTheme.sky)
                    }
                    Spacer()
                    Label("\(model.roundSeconds) sec", systemImage: "timer")
                        .font(.title2.bold())
                        .foregroundStyle(.secondary)
                }

                VStack(spacing: 12) {
                    Text(isRoundLive ? selectedGame.title : model.largeScreenPrompt)
                        .font(.largeTitle.bold())
                    Text(isRoundLive ? "Round live. Pass the remote when time is up." : "Choose a game, then start together.")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 30) {
                    ForEach(model.supportedGames) { game in
                        Button {
                            selectedGame = game
                            isRoundLive = false
                        } label: {
                            Label(game.title, systemImage: game.systemImage)
                                .font(.title2.bold())
                                .frame(minWidth: 300, minHeight: 86)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(
                            selectedGame == game
                                ? LexJoltTheme.brandBlue
                                : Color.white.opacity(0.2)
                        )
                        .accessibilityIdentifier("tv.game.\(game.rawValue)")
                    }
                }

                Button {
                    isRoundLive.toggle()
                } label: {
                    Label(
                        isRoundLive ? "End round" : model.primaryActionTitle,
                        systemImage: isRoundLive ? "stop.fill" : "play.fill"
                    )
                    .font(.title2.bold())
                    .frame(minWidth: 410, minHeight: 88)
                }
                .buttonStyle(.borderedProminent)
                .tint(isRoundLive ? Color.red : LexJoltTheme.brandBlue)
                .accessibilityIdentifier("tv.round.toggle")
            }
            .padding(80)
            .frame(maxWidth: 1500)
        }
        .foregroundStyle(.white)
        .accessibilityIdentifier("lexjolt.tv")
    }
}

public struct VisionSpatialTileBoardView: View {
    private let concept: VisionSpatialTileBoardConcept
    @State private var isExpanded = false

    public init(concept: VisionSpatialTileBoardConcept) {
        self.concept = concept
    }

    public var body: some View {
        VStack(spacing: 36) {
            HStack(spacing: 18) {
                LexJoltBrandMark(size: 82)
                    .padding(10)
                    .background(LexJoltTheme.brandBlue)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                VStack(alignment: .leading, spacing: 3) {
                    Text("LexJolt")
                        .font(.largeTitle.bold())
                    Text("Spatial Word Board")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }

            ZStack {
                ForEach(concept.tiles) { tile in
                    Text(tile.letter)
                        .font(.system(size: 44, weight: .black, design: .rounded))
                        .foregroundStyle(LexJoltTheme.navy)
                        .frame(width: 84, height: 84)
                        .background(tile.index.isMultiple(of: 2) ? Color.white : LexJoltTheme.paleBlue)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay {
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(LexJoltTheme.navy, lineWidth: 3)
                        }
                        .offset(
                            x: (tile.position.x - 216) * (isExpanded ? 1.12 : 1),
                            y: tile.position.y + (isExpanded && tile.index.isMultiple(of: 2) ? -18 : 0)
                        )
                        .shadow(color: .black.opacity(0.18), radius: 12, y: 8)
                }
            }
            .frame(height: 190)
            .frame(maxWidth: .infinity)
            .background(.thinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            HStack(spacing: 18) {
                Label("Daily Jolt", systemImage: "calendar")
                    .font(.headline)
                Label("Word Board", systemImage: "square.grid.3x3.fill")
                    .font(.headline)
                Spacer()
                Button {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.76)) {
                        isExpanded.toggle()
                    }
                } label: {
                    Label(isExpanded ? "Gather tiles" : "Spread tiles", systemImage: "arrow.left.and.right")
                }
                .buttonStyle(.borderedProminent)
                .tint(LexJoltTheme.brandBlue)
                .accessibilityIdentifier("vision.tiles.toggle")
            }
        }
        .padding(40)
        .frame(minWidth: 820, minHeight: 520)
        .accessibilityIdentifier("lexjolt.vision")
    }
}

public struct AppleEcosystemRootView: View {
    private let role: AppleDeviceRole
    @StateObject private var viewModel: LexJoltViewModel

    @MainActor
    public init(
        role: AppleDeviceRole,
        viewModel: LexJoltViewModel = LexJoltViewModel(
            reminderScheduler: LocalNotificationReminderScheduler()
        )
    ) {
        self.role = role
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    public var body: some View {
        switch role {
        case .iPad:
            IPadDashboardView(viewModel: viewModel)
        case .mac:
            MacDashboardView(model: MacDashboardModel())
        case .watch:
            WatchCompanionView(
                model: WatchCompanionModel(
                    progress: viewModel.progress,
                    isDailyComplete: false
                ),
                scheduleReminder: {
                    do {
                        try await viewModel.scheduleDailyReminder()
                        return true
                    } catch {
                        return false
                    }
                }
            )
        case .tv:
            TVPartyModeView()
        case .vision:
            VisionSpatialTileBoardView(concept: VisionSpatialTileBoardConcept(letters: "LEXJOLT"))
        }
    }
}

public struct WordUnscramblerScreen: View {
    @State private var letters = ""
    private let game = WordUnscramblerGame(dictionary: LexJoltPreviewData.dictionary())

    public init() {}

    public var body: some View {
        let normalizedLetters = normalizeLetters(letters)
        let results = game.results(for: letters)

        Form {
            TextField("Letters", text: $letters)
                .lexJoltCharacterInput()
                .accessibilityIdentifier("unscrambler.input")

            if results.isEmpty {
                Text(normalizedLetters.isEmpty ? "Enter two or more letters." : "No words can be formed from these letters.")
                    .foregroundStyle(.secondary)
                    .accessibilityIdentifier("unscrambler.empty")
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
                .accessibilityIdentifier("unscrambler.results")
            }
        }
    }
}

public struct AnagramRushScreen: View {
    private enum Phase: Equatable {
        case ready
        case active(endsAt: Date)
        case finished
    }

    private static let roundDuration: TimeInterval = 90

    @State private var entry = ""
    @State private var game = AnagramRushGame(
        dictionary: LexJoltPreviewData.dictionary(),
        rack: "PLEA"
    )
    @State private var phase: Phase = .ready
    @State private var message = "Find as many words as you can."

    public init() {}

    public var body: some View {
        TimelineView(.periodic(from: .now, by: 0.25)) { context in
            let secondsRemaining = remainingSeconds(at: context.date)

            Form {
                Section {
                    HStack {
                        Label("\(secondsRemaining)", systemImage: "timer")
                            .font(.title.bold())
                            .monospacedDigit()
                            .accessibilityLabel("\(secondsRemaining) seconds remaining")
                        Spacer()
                        Text("Score \(game.totalScore)")
                            .font(.headline)
                    }
                }

                switch phase {
                case .ready:
                    Text("90-second round")
                        .font(.title2.bold())
                    Text(message)
                        .foregroundStyle(.secondary)
                    Button {
                        startRound()
                    } label: {
                        Label("Start Round", systemImage: "play.fill")
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.borderedProminent)
                    .accessibilityIdentifier("rush.start")

                case .active:
                    Text("P L E A")
                        .font(.system(.largeTitle, design: .monospaced, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .accessibilityLabel("Rack P L E A")
                    Text(message)
                        .foregroundStyle(.secondary)
                    TextField("Enter a word", text: $entry)
                        .lexJoltCharacterInput()
                        .accessibilityIdentifier("rush.input")
                    Button("Submit") {
                        submitRushWord()
                    }
                    .disabled(normalizeLetters(entry).isEmpty)
                    .accessibilityIdentifier("rush.submit")

                case .finished:
                    ContentUnavailableView(
                        "Round Complete",
                        systemImage: "flag.checkered",
                        description: Text("Final score: \(game.totalScore)")
                    )
                    Button {
                        resetRound()
                    } label: {
                        Label("Play Again", systemImage: "arrow.clockwise")
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.borderedProminent)
                    .accessibilityIdentifier("rush.replay")
                }
            }
            .onChange(of: secondsRemaining) { _, newValue in
                if newValue == 0, case .active = phase {
                    phase = .finished
                    entry = ""
                }
            }
        }
    }

    private func remainingSeconds(at date: Date) -> Int {
        switch phase {
        case .ready:
            Int(Self.roundDuration)
        case .active(let endsAt):
            max(0, Int(ceil(endsAt.timeIntervalSince(date))))
        case .finished:
            0
        }
    }

    private func startRound() {
        phase = .active(endsAt: Date().addingTimeInterval(Self.roundDuration))
        message = "Rack ready. Go."
    }

    private func submitRushWord() {
        let result = game.submit(entry)
        switch result {
        case .accepted(let score):
            message = "+\(score) points"
        case .duplicate:
            message = "Already found"
        case .invalid:
            message = "Not valid for this rack"
        }
        entry = ""
    }

    private func resetRound() {
        game = AnagramRushGame(dictionary: LexJoltPreviewData.dictionary(), rack: "PLEA")
        phase = .ready
        message = "Find as many words as you can."
    }
}

public struct DailyScrambleScreen: View {
    @State private var entry = ""
    @State private var foundWords: [String] = []
    @State private var message = ""
    private let game = DailyScrambleGame(
        dictionary: LexJoltPreviewData.dictionary(),
        date: Date()
    )

    public init() {}

    public var body: some View {
        Form {
            Text("Daily Jolt")
                .font(.title.bold())
            Text("Letters: \(game.letters)")
            Text("Required: \(String(game.requiredLetter))")
                .foregroundStyle(.secondary)
            TextField("Word", text: $entry)
                .lexJoltCharacterInput()
                .accessibilityIdentifier("daily.input")
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
            .accessibilityIdentifier("daily.submit")
            Text(message)
                .foregroundStyle(.secondary)
                .accessibilityIdentifier("daily.message")
            if !foundWords.isEmpty {
                Section("Found") {
                    ForEach(foundWords, id: \.self) { word in
                        Text(word)
                    }
                }
            }
            #if os(tvOS)
            Text("Found \(foundWords.count) words today")
                .foregroundStyle(.secondary)
            #else
            ShareLink(item: "I found \(foundWords.count) words in today's LexJolt Daily Jolt.")
            #endif
        }
    }
}

public struct SpellingBeeScreen: View {
    @State private var entry = ""
    @State private var score = 0
    @State private var foundWords: Set<String> = []
    @State private var message = "Use P in every word."
    private let game = SpellingBeeGame(
        dictionary: LexJoltPreviewData.dictionary(),
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
                .lexJoltCharacterInput()
                .accessibilityIdentifier("spelling.input")
            Button("Check") {
                let normalized = normalizeLetters(entry)
                if foundWords.contains(normalized) {
                    message = "Already found"
                } else if game.accepts(normalized) {
                    let earned = game.score(normalized)
                    score += earned
                    foundWords.insert(normalized)
                    message = "+\(earned)"
                } else {
                    message = "Not valid"
                }
                entry = ""
            }
            .accessibilityIdentifier("spelling.submit")
            Text(message)
                .foregroundStyle(.secondary)
                .accessibilityIdentifier("spelling.message")
        }
    }
}

public struct GuessTheWordScreen: View {
    @State private var guess = ""
    @State private var rows: [(String, [GuessMark])] = []
    @State private var message = "Five letters"
    private let game = GuessTheWordGame(
        dictionary: LexJoltPreviewData.dictionary(),
        target: "STONE"
    )

    public init() {}

    public var body: some View {
        Form {
            Text("Guess the Word")
                .font(.title.bold())
            TextField("Guess", text: $guess)
                .lexJoltCharacterInput()
                .accessibilityIdentifier("guess.input")
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
            .accessibilityIdentifier("guess.submit")
            Text(message)
                .foregroundStyle(.secondary)
                .accessibilityIdentifier("guess.message")
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

public struct LexJoltAppScene: App {
    public init() {}

    public var body: some Scene {
        WindowGroup {
            LexJoltUniversalRootView()
        }
    }
}

private extension View {
    @ViewBuilder
    func lexJoltInlineNavigationTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }

    @ViewBuilder
    func lexJoltCharacterInput() -> some View {
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

private enum LexJoltPreviewData {
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
