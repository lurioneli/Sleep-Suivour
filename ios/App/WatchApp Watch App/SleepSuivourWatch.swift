import SwiftUI
import WatchConnectivity

/// Sleep Suivour Apple Watch App — Entry Point
@main
struct SleepSuivourWatch: App {
    @WKApplicationDelegateAdaptor(WatchAppDelegate.self) var delegate

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(WatchState.shared)
        }
    }
}

/// Watch App Delegate — handles WCSession lifecycle
class WatchAppDelegate: NSObject, WKApplicationDelegate {
    func applicationDidFinishLaunching() {
        WatchConnectivityManager.shared.activate()

        // Forward received state to WatchState
        WatchConnectivityManager.shared.$receivedState
            .sink { state in
                WatchState.shared.update(from: state)
            }
            .store(in: &cancellables)

        // Track reachability changes
        WatchConnectivityManager.shared.$isReachable
            .sink { reachable in
                DispatchQueue.main.async {
                    WatchState.shared.isPhoneReachable = reachable
                }
            }
            .store(in: &cancellables)
    }

    private var cancellables = Set<AnyCancellable>()
}

import Combine
