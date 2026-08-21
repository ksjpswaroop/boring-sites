import SwiftUI
import LexJoltApp

@main
struct LexJoltiOSApp: App {
    @State private var hasFinishedLaunching = false

    private var splashDuration: Duration {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-keepSplashVisible") {
            return .seconds(10)
        }
        #endif
        return .milliseconds(700)
    }

    var body: some Scene {
        WindowGroup {
            ZStack {
                if hasFinishedLaunching {
                    LexJoltUniversalRootView()
                        .transition(.opacity)
                } else {
                    LexJoltSplashView()
                        .transition(.opacity)
                }
            }
            .task {
                guard !hasFinishedLaunching else { return }
                try? await Task.sleep(for: splashDuration)
                withAnimation(.easeOut(duration: 0.28)) {
                    hasFinishedLaunching = true
                }
            }
        }
    }
}
