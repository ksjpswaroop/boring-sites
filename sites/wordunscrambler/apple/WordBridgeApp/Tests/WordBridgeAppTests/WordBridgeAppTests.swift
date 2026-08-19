import XCTest
import WordGameCore
@testable import WordBridgeApp

final class WordBridgeAppTests: XCTestCase {
    private let dictionary = WordDictionary(words: [
        "ace", "act", "cat", "tac", "dog", "apple", "pea", "ape", "plea", "peal",
        "leap", "pale", "pear", "bear", "read", "dear", "dare", "quiz", "stone", "tones"
    ])

    func testV1CatalogContainsExactlyTheFiveLockedGames() {
        XCTAssertEqual(WordBridgeCatalog.v1Games, [
            .wordUnscrambler,
            .anagramRush,
            .dailyScramble,
            .spellingBee,
            .guessTheWord
        ])
        XCTAssertEqual(WordBridgeCatalog.v1Games.map(\.title), [
            "Word Unscrambler",
            "Anagram Rush",
            "Daily Scramble",
            "Spelling Bee",
            "Guess the Word"
        ])
    }

    func testV1PolicyHasNoAdsLoginBackendOrPaymentsAndSupportsOfflinePlay() {
        XCTAssertFalse(WordBridgePolicy.hasAds)
        XCTAssertFalse(WordBridgePolicy.requiresLogin)
        XCTAssertFalse(WordBridgePolicy.usesBackend)
        XCTAssertFalse(WordBridgePolicy.hasPayments)
        XCTAssertTrue(WordBridgePolicy.supportsOfflinePlay)
    }

    func testProgressTracksSessionsBestScoresAchievementsAndDailyStreaks() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let engine = ProgressEngine(calendar: calendar)
        let dayOne = Date(timeIntervalSince1970: 1_704_067_200)
        let dayTwo = dayOne.addingTimeInterval(86_400)

        let first = engine.applying(
            GameCompletion(game: .dailyScramble, score: 42, completedAt: dayOne),
            to: WordBridgeProgress()
        )
        XCTAssertEqual(first.completedSessions, 1)
        XCTAssertEqual(first.currentStreak, 1)
        XCTAssertEqual(first.bestScores[.dailyScramble], 42)
        XCTAssertTrue(first.achievements.contains("first_game"))
        XCTAssertTrue(first.achievements.contains("daily_started"))

        let second = engine.applying(
            GameCompletion(game: .dailyScramble, score: 30, completedAt: dayTwo),
            to: first
        )
        XCTAssertEqual(second.completedSessions, 2)
        XCTAssertEqual(second.currentStreak, 2)
        XCTAssertEqual(second.bestScores[.dailyScramble], 42)
        XCTAssertTrue(second.achievements.contains("two_day_streak"))
    }

    func testFileProgressStorePersistsLocally() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let store = FileProgressStore(fileURL: directory.appendingPathComponent("progress.json"))
        let progress = WordBridgeProgress(
            completedSessions: 3,
            currentStreak: 2,
            bestScores: [.anagramRush: 91],
            achievements: ["first_game", "rush_rookie"]
        )

        try store.save(progress)
        XCTAssertEqual(try store.load(), progress)
    }

    func testWordUnscramblerReturnsScoredResultsFromCoreDictionary() {
        let game = WordUnscramblerGame(dictionary: dictionary)

        XCTAssertEqual(game.results(for: "plea").map(\.word), ["PLEA", "LEAP", "PALE", "PEAL", "APE", "PEA"])
        XCTAssertEqual(game.results(for: "zzz"), [])
        XCTAssertEqual(game.results(for: "plea").first?.score, scrabbleScore("PLEA"))
    }

    func testAnagramRushAcceptsValidWordsRejectsDuplicatesAndScoresRound() {
        var game = AnagramRushGame(dictionary: dictionary, rack: "plea")

        XCTAssertEqual(game.submit("plea"), .accepted(score: scrabbleScore("PLEA") + 4))
        XCTAssertEqual(game.submit("plea"), .duplicate)
        XCTAssertEqual(game.submit("apple"), .invalid)
        XCTAssertEqual(game.totalScore, scrabbleScore("PLEA") + 4)
    }

    func testDailyScrambleIsDeterministicAndRequiresCenterLetter() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let date = Date(timeIntervalSince1970: 1_704_067_200)

        let first = DailyScrambleGame(dictionary: dictionary, date: date, calendar: calendar)
        let second = DailyScrambleGame(dictionary: dictionary, date: date, calendar: calendar)

        XCTAssertEqual(first.letters, second.letters)
        XCTAssertEqual(first.requiredLetter, second.requiredLetter)
        XCTAssertTrue(first.puzzleWord.contains(first.requiredLetter))
        XCTAssertTrue(first.accepts(first.puzzleWord))
        XCTAssertFalse(first.accepts("dog"))
    }

    func testSpellingBeeValidatesRequiredLetterDictionaryAndScoresPangramBonus() {
        let game = SpellingBeeGame(dictionary: dictionary, letters: "pleardx", requiredLetter: "p")

        XCTAssertTrue(game.accepts("plea"))
        XCTAssertFalse(game.accepts("read"))
        XCTAssertFalse(game.accepts("zzzz"))
        XCTAssertEqual(game.score("plea"), 4)
        XCTAssertGreaterThan(game.score("pleardx"), 7)
    }

    func testGuessTheWordValidatesDictionaryAndEvaluatesFeedback() {
        let game = GuessTheWordGame(dictionary: dictionary, target: "stone")

        XCTAssertTrue(game.isValidGuess("tones"))
        XCTAssertFalse(game.isValidGuess("xxxxx"))
        XCTAssertEqual(game.evaluate("tones"), [.present, .present, .present, .present, .present])
        XCTAssertEqual(game.evaluate("stone"), [.correct, .correct, .correct, .correct, .correct])
    }

    func testShareCardsIncludeGameScoreStreakAndAppName() {
        let progress = WordBridgeProgress(completedSessions: 4, currentStreak: 3)
        let card = ShareCardFactory.card(
            for: GameCompletion(game: .anagramRush, score: 88, completedAt: Date(timeIntervalSince1970: 0)),
            progress: progress
        )

        XCTAssertEqual(card.title, "WordBridge Anagram Rush")
        XCTAssertTrue(card.body.contains("88"))
        XCTAssertTrue(card.body.contains("3-day streak"))
        XCTAssertTrue(card.body.contains("WordBridge"))
    }

    @MainActor
    func testDailyReminderSchedulerRecordsLocalNotificationIntent() async throws {
        let scheduler = RecordingReminderScheduler()

        try await scheduler.scheduleDailyPuzzleReminder(hour: 9, minute: 30)

        XCTAssertEqual(scheduler.scheduledReminders, [.init(hour: 9, minute: 30)])
    }

    @MainActor
    func testViewModelSchedulesDailyReminderThroughInjectedScheduler() async throws {
        let scheduler = RecordingReminderScheduler()
        let viewModel = WordBridgeViewModel(reminderScheduler: scheduler)

        try await viewModel.scheduleDailyReminder(hour: 8, minute: 15)

        XCTAssertEqual(scheduler.scheduledReminders, [.init(hour: 8, minute: 15)])
    }

    @MainActor
    func testViewModelExposesTodayScreenData() {
        let viewModel = WordBridgeViewModel(progress: WordBridgeProgress(completedSessions: 2, currentStreak: 1))

        XCTAssertEqual(viewModel.games, WordBridgeCatalog.v1Games)
        XCTAssertEqual(viewModel.progress.completedSessions, 2)
        XCTAssertEqual(viewModel.todayTitle, "Today")
    }

    @MainActor
    func testViewModelRecordsSanitizedAnalyticsForCompletionAndShare() throws {
        let recorder = LocalAnalyticsRecorder()
        let viewModel = WordBridgeViewModel(analyticsRecorder: recorder)
        let completion = GameCompletion(
            game: .dailyScramble,
            score: 42,
            completedAt: Date(timeIntervalSince1970: 0)
        )

        try viewModel.complete(completion)
        _ = viewModel.shareCard(for: completion)

        XCTAssertEqual(recorder.events.map(\.name), [.dailyCompleted, .shareCardCreated])
        XCTAssertTrue(recorder.events.allSatisfy(\.isPrivacySafe))
        XCTAssertEqual(recorder.events.first?.properties[.scoreBucket], "40-49")
    }

    func testPhase3DeviceCatalogDefinesAdaptedAppleEcosystemRoles() {
        XCTAssertEqual(WordBridgeEcosystem.phase3Experiences.map(\.role), [
            .iPad,
            .mac,
            .watch,
            .tv,
            .vision
        ])

        XCTAssertEqual(WordBridgeEcosystem.experience(for: .iPad).primaryPattern, .splitViewDashboard)
        XCTAssertEqual(WordBridgeEcosystem.experience(for: .mac).primaryPattern, .keyboardDashboard)
        XCTAssertEqual(WordBridgeEcosystem.experience(for: .watch).primaryPattern, .companionGlance)
        XCTAssertEqual(WordBridgeEcosystem.experience(for: .tv).primaryPattern, .partyMode)
        XCTAssertEqual(WordBridgeEcosystem.experience(for: .vision).primaryPattern, .spatialBoard)
    }

    func testIPadDashboardUsesSplitViewLargeBoardsAndStats() {
        let progress = WordBridgeProgress(
            completedSessions: 7,
            currentStreak: 4,
            bestScores: [.dailyScramble: 42, .anagramRush: 91],
            achievements: ["first_game", "rush_rookie"]
        )
        let model = IPadDashboardModel(progress: progress, selectedGame: .dailyScramble)

        XCTAssertEqual(model.layout, .splitView)
        XCTAssertEqual(model.boardSize, .large)
        XCTAssertEqual(model.selectedGame, .dailyScramble)
        XCTAssertEqual(model.stats.first { $0.game == .anagramRush }?.bestScore, 91)
        XCTAssertTrue(model.statsSummary.contains("7 sessions"))
        XCTAssertTrue(model.statsSummary.contains("4-day streak"))
    }

    func testMacExperienceIsKeyboardFirstWithHistoryAndLongerSessions() {
        let completion = GameCompletion(game: .anagramRush, score: 88, completedAt: Date(timeIntervalSince1970: 0))
        let model = MacDashboardModel(history: [completion])

        XCTAssertTrue(model.isKeyboardFirst)
        XCTAssertEqual(model.defaultSessionMinutes, 20)
        XCTAssertEqual(model.history.first?.game, .anagramRush)
        XCTAssertTrue(model.shortcuts.contains(.init(key: "N", modifiers: [.command], action: "New round")))
        XCTAssertTrue(model.shortcuts.contains(.init(key: "Return", modifiers: [], action: "Submit word")))
    }

    func testWatchCompanionShowsStreakReminderAndDailyCompletionStatus() {
        let incomplete = WatchCompanionModel(
            progress: WordBridgeProgress(completedSessions: 5, currentStreak: 3),
            isDailyComplete: false
        )
        let complete = WatchCompanionModel(
            progress: WordBridgeProgress(completedSessions: 6, currentStreak: 4),
            isDailyComplete: true
        )

        XCTAssertEqual(incomplete.streakText, "3-day streak")
        XCTAssertEqual(incomplete.reminderTitle, "Daily Scramble")
        XCTAssertEqual(incomplete.completionStatus, .notComplete)
        XCTAssertEqual(complete.completionStatus, .complete)
    }

    func testTVPartyModeSupportsGuessingAndTimedWordRounds() {
        let model = TVPartyModeModel(roundSeconds: 90)

        XCTAssertEqual(model.supportedGames, [.guessTheWord, .anagramRush])
        XCTAssertEqual(model.roundSeconds, 90)
        XCTAssertEqual(model.inputMode, .remoteFriendly)
        XCTAssertTrue(model.largeScreenPrompt.contains("WordBridge"))
    }

    func testVisionSpatialBoardCreatesDepthBasedTileLayout() {
        let board = VisionSpatialTileBoardConcept(letters: "BRIDGE")

        XCTAssertEqual(board.tiles.map(\.letter), ["B", "R", "I", "D", "G", "E"])
        XCTAssertEqual(board.presentation, .spatialBoard)
        XCTAssertEqual(board.tiles.first?.position.z, 0)
        XCTAssertGreaterThan(board.tiles.last?.position.z ?? 0, 0)
        XCTAssertEqual(Set(board.tiles.map(\.position.x)).count, board.tiles.count)
    }

    func testAnalyticsEventsArePrivacyPreservingAndRejectRawInputs() {
        let event = AnalyticsEvent(
            name: .dailyCompleted,
            occurredAt: Date(timeIntervalSince1970: 0),
            properties: [
                .game: "Daily Scramble",
                .scoreBucket: "40-49",
                .rawLetters: "secret",
                .email: "person@example.com",
                .rawWord: "apple"
            ]
        )

        let sanitized = PrivacyPreservingAnalytics.sanitize(event)

        XCTAssertEqual(sanitized.properties[.game], "Daily Scramble")
        XCTAssertEqual(sanitized.properties[.scoreBucket], "40-49")
        XCTAssertNil(sanitized.properties[.rawLetters])
        XCTAssertNil(sanitized.properties[.email])
        XCTAssertNil(sanitized.properties[.rawWord])
        XCTAssertTrue(sanitized.isPrivacySafe)
    }

    func testRetentionMetricsMeasureDailyCompletionReplayRetentionShareUsageAndCrashes() {
        let day0 = Date(timeIntervalSince1970: 1_704_067_200)
        let day1 = day0.addingTimeInterval(86_400)
        let day7 = day0.addingTimeInterval(86_400 * 7)
        let events: [AnalyticsEvent] = [
            .init(name: .appInstalled, occurredAt: day0),
            .init(name: .sessionStarted, occurredAt: day0),
            .init(name: .dailyCompleted, occurredAt: day0),
            .init(name: .rushRoundCompleted, occurredAt: day0),
            .init(name: .rushRoundCompleted, occurredAt: day0.addingTimeInterval(30)),
            .init(name: .shareCardCreated, occurredAt: day1),
            .init(name: .crashReported, occurredAt: day1),
            .init(name: .sessionStarted, occurredAt: day7)
        ]

        let metrics = RetentionMetricsCalculator(calendar: utcCalendar()).calculate(events: events)

        XCTAssertEqual(metrics.dailyCompletionRate, 0.5)
        XCTAssertEqual(metrics.rushReplayRate, 0.5)
        XCTAssertEqual(metrics.sevenDayRetentionRate, 1.0)
        XCTAssertEqual(metrics.shareUsageCount, 1)
        XCTAssertEqual(metrics.crashCount, 1)
    }

    func testFeedbackInboxCollectsPrioritizedIssuesBeforeMonetization() {
        let inbox = FeedbackInbox(records: [
            .init(category: .dictionaryQuality, message: "Missing common word", severity: .high),
            .init(category: .difficulty, message: "Daily too hard", severity: .medium),
            .init(category: .onboarding, message: "Explain center letter", severity: .low)
        ])

        XCTAssertEqual(inbox.records.count, 3)
        XCTAssertEqual(inbox.topPriority?.category, .dictionaryQuality)
        XCTAssertEqual(inbox.improvementBacklog.map(\.area), [.dictionaryQuality, .difficulty, .onboarding])
    }

    func testMonetizationGateRequiresRetentionValidationAndFeedbackReview() {
        let weakMetrics = RetentionMetrics(
            dailyCompletionRate: 0.20,
            rushReplayRate: 0.10,
            sevenDayRetentionRate: 0.05,
            shareUsageCount: 0,
            crashCount: 3
        )
        let strongMetrics = RetentionMetrics(
            dailyCompletionRate: 0.55,
            rushReplayRate: 0.35,
            sevenDayRetentionRate: 0.25,
            shareUsageCount: 12,
            crashCount: 0
        )
        let reviewedFeedback = FeedbackInbox(records: [
            .init(category: .gameBalance, message: "Rush feels fair", severity: .low)
        ])

        XCTAssertFalse(MonetizationReadinessGate.canConsiderAds(metrics: weakMetrics, feedback: reviewedFeedback))
        XCTAssertTrue(MonetizationReadinessGate.canConsiderAds(metrics: strongMetrics, feedback: reviewedFeedback))
        XCTAssertFalse(WordBridgePolicy.hasAds)
    }

    func testRetentionReviewTurnsWeakMetricsIntoImprovementPrioritiesBeforeMonetization() {
        let weakMetrics = RetentionMetrics(
            dailyCompletionRate: 0.20,
            rushReplayRate: 0.10,
            sevenDayRetentionRate: 0.05,
            shareUsageCount: 0,
            crashCount: 2
        )
        let feedback = FeedbackInbox(records: [
            .init(category: .dictionaryQuality, message: "Missing common word", severity: .high),
            .init(category: .difficulty, message: "Timed rounds feel too hard", severity: .medium)
        ])

        let review = RetentionImprovementPlanner().review(metrics: weakMetrics, feedback: feedback)

        XCTAssertEqual(review.status, .needsIteration)
        XCTAssertFalse(review.canConsiderMonetization)
        XCTAssertEqual(review.improvements.first?.area, .stability)
        XCTAssertTrue(review.improvements.contains { $0.area == .onboarding })
        XCTAssertTrue(review.improvements.contains { $0.area == .difficulty })
        XCTAssertTrue(review.improvements.contains { $0.area == .dictionaryQuality })
        XCTAssertTrue(review.improvements.contains { $0.area == .gameBalance })
        XCTAssertTrue(review.improvements.contains { $0.area == .sharing })
    }

    func testRetentionReviewCanAdvanceOnlyAfterMetricsPassAndBlockingFeedbackIsResolved() {
        let strongMetrics = RetentionMetrics(
            dailyCompletionRate: 0.62,
            rushReplayRate: 0.40,
            sevenDayRetentionRate: 0.28,
            shareUsageCount: 8,
            crashCount: 0
        )
        let reviewedFeedback = FeedbackInbox(records: [
            .init(category: .gameBalance, message: "Daily loop feels solid", severity: .low)
        ])

        let review = RetentionImprovementPlanner().review(metrics: strongMetrics, feedback: reviewedFeedback)

        XCTAssertEqual(review.status, .readyForMoreTesters)
        XCTAssertTrue(review.improvements.isEmpty)
        XCTAssertTrue(review.canConsiderMonetization)
    }

    func testRetentionReviewRequiresQualitativeFeedbackEvenWhenMetricsPass() {
        let strongMetrics = RetentionMetrics(
            dailyCompletionRate: 0.62,
            rushReplayRate: 0.40,
            sevenDayRetentionRate: 0.28,
            shareUsageCount: 8,
            crashCount: 0
        )

        let review = RetentionImprovementPlanner().review(metrics: strongMetrics, feedback: FeedbackInbox(records: []))

        XCTAssertEqual(review.status, .needsIteration)
        XCTAssertFalse(review.canConsiderMonetization)
        XCTAssertEqual(review.improvements.map(\.area), [.onboarding])
    }

    func testTestFlightPlanDocumentsRequiredLaunchInputs() {
        let plan = TestFlightLaunchPlan.defaultPlan

        XCTAssertEqual(plan.bundleIdentifier, "com.boringsites.wordbridge")
        XCTAssertTrue(plan.requiredExternalInputs.contains(.appleDistributionCertificate))
        XCTAssertTrue(plan.requiredExternalInputs.contains(.appStoreConnectAppRecord))
        XCTAssertTrue(plan.requiredExternalInputs.contains(.appStoreConnectApiKey))
        XCTAssertEqual(plan.betaGoals, [.retention, .dailyCompletion, .replayRate, .shareUsage, .crashes, .feedback])
    }
}

private func utcCalendar() -> Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0)!
    return calendar
}

private struct RecordingReminder: Equatable {
    let hour: Int
    let minute: Int
}

private final class RecordingReminderScheduler: DailyReminderScheduling {
    private(set) var scheduledReminders: [RecordingReminder] = []

    func scheduleDailyPuzzleReminder(hour: Int, minute: Int) async throws {
        scheduledReminders.append(.init(hour: hour, minute: minute))
    }
}
