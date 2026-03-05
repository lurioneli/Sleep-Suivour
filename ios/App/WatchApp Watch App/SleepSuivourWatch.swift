import SwiftUI
import WatchConnectivity
import WatchKit

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

/// Watch App Delegate — handles WCSession lifecycle and HealthKit
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

        // Initialize HealthKit
        Task { @MainActor in
            let hkManager = WatchHealthKitManager.shared
            guard hkManager.isAvailable else { return }
            let authorized = await hkManager.requestAuthorization()
            if authorized {
                await hkManager.forceRefresh()
                hkManager.scheduleBackgroundRefresh()
            }
        }
    }

    func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
        for task in backgroundTasks {
            switch task {
            case let refreshTask as WKApplicationRefreshBackgroundTask:
                Task { @MainActor in
                    await WatchHealthKitManager.shared.forceRefresh()
                    WatchHealthKitManager.shared.scheduleBackgroundRefresh()
                    refreshTask.setTaskCompletedWithSnapshot(false)
                }
            default:
                task.setTaskCompletedWithSnapshot(false)
            }
        }
    }

    private var cancellables = Set<AnyCancellable>()
}

import Combine
