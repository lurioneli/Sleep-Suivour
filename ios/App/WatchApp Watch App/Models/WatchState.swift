import Foundation
import Combine
import WatchConnectivity
import WidgetKit

/// Observable state model for Watch UI. Updated when iPhone sends state via WCSession.
/// Persists last-known state to UserDefaults so the Watch shows meaningful data even when iPhone is unreachable.
class WatchState: ObservableObject {
    static let shared = WatchState()

    @Published var isFasting: Bool = false
    @Published var fastStartTime: TimeInterval = 0  // Unix ms
    @Published var fastGoalHours: Double = 16
    @Published var isSleeping: Bool = false
    @Published var sleepStartTime: TimeInterval = 0
    @Published var sleepGoalHours: Double = 8
    @Published var heartPoints: Int = 0
    @Published var lastUpdate: Date = Date.distantPast

    // Connectivity status
    @Published var isPhoneReachable: Bool = false

    // Toast feedback from iPhone (e.g., "Water +10 XP")
    @Published var toastTitle: String = ""
    @Published var toastBody: String = ""
    @Published var showToast: Bool = false

    // HealthKit data (populated by WatchHealthKitManager)
    @Published var todaySteps: Int = 0
    @Published var lastNightSleep: WatchSleepData?
    @Published var currentHeartRate: Double?
    @Published var restingHeartRate: Int?
    @Published var hrv: Double?
    @Published var healthKitAvailable: Bool = false
    @Published var healthKitLastFetch: Date = .distantPast

    private static let cacheKey = "watchStateCache"

    private init() {
        loadCachedState()
    }

    /// Update from WCSession application context
    func update(from context: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if let val = context["isFasting"] as? Bool { self.isFasting = val }
            if let val = context["fastStartTime"] as? Double { self.fastStartTime = val }
            if let val = context["fastGoalHours"] as? Double { self.fastGoalHours = val }
            if let val = context["isSleeping"] as? Bool { self.isSleeping = val }
            if let val = context["sleepStartTime"] as? Double { self.sleepStartTime = val }
            if let val = context["sleepGoalHours"] as? Double { self.sleepGoalHours = val }
            if let val = context["heartPoints"] as? Int { self.heartPoints = val }
            self.lastUpdate = Date()

            // Persist to UserDefaults for offline access
            self.cacheState()

            // Refresh watch face complication with new data
            WidgetCenter.shared.reloadAllTimelines()

            // Show toast if iPhone sent one
            if let title = context["toastTitle"] as? String, !title.isEmpty {
                self.toastTitle = title
                self.toastBody = (context["toastBody"] as? String) ?? ""
                self.showToast = true
                // Auto-dismiss after 2 seconds
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    self.showToast = false
                }
            }
        }
    }

    /// Eating state — not fasting and not sleeping (can log meals)
    var isEating: Bool {
        return !isFasting && !isSleeping
    }

    /// Elapsed fasting time in seconds (calculated live)
    var fastElapsedSeconds: TimeInterval {
        guard isFasting, fastStartTime > 0 else { return 0 }
        return max(0, (Date().timeIntervalSince1970 * 1000 - fastStartTime) / 1000)
    }

    /// Fasting progress as 0.0-1.0 fraction
    var fastProgress: Double {
        guard fastGoalHours > 0 else { return 0 }
        return min(1.0, fastElapsedSeconds / (fastGoalHours * 3600))
    }

    /// Elapsed sleep time in seconds
    var sleepElapsedSeconds: TimeInterval {
        guard isSleeping, sleepStartTime > 0 else { return 0 }
        return max(0, (Date().timeIntervalSince1970 * 1000 - sleepStartTime) / 1000)
    }

    /// Whether the cached state is stale (older than 5 minutes)
    var isStale: Bool {
        return lastUpdate.timeIntervalSinceNow < -300
    }

    /// Human-readable "last synced" string
    var lastSyncedText: String {
        if lastUpdate == Date.distantPast { return "Not synced" }
        let seconds = Int(-lastUpdate.timeIntervalSinceNow)
        if seconds < 10 { return "Just now" }
        if seconds < 60 { return "\(seconds)s ago" }
        let minutes = seconds / 60
        if minutes < 60 { return "\(minutes)m ago" }
        let hours = minutes / 60
        return "\(hours)h ago"
    }

    /// Format seconds to "Xh Ym" display
    static func formatElapsed(_ seconds: TimeInterval) -> String {
        let total = Int(seconds)
        let h = total / 3600
        let m = (total % 3600) / 60
        if h > 0 { return "\(h)h \(m)m" }
        return "\(m)m"
    }

    // MARK: - State Persistence

    /// Cache HealthKit data separately (called by WatchHealthKitManager after fetch)
    func cacheHealthKitData() {
        var cache: [String: Any] = [
            "todaySteps": todaySteps,
            "healthKitAvailable": healthKitAvailable,
            "healthKitLastFetch": healthKitLastFetch.timeIntervalSince1970
        ]
        if let hr = currentHeartRate { cache["currentHeartRate"] = hr }
        if let rhr = restingHeartRate { cache["restingHeartRate"] = rhr }
        if let h = hrv { cache["hrv"] = h }
        if let sleep = lastNightSleep {
            cache["sleepTotalMinutes"] = sleep.totalMinutes
            cache["sleepDeepMinutes"] = sleep.deepMinutes
            cache["sleepRemMinutes"] = sleep.remMinutes
            cache["sleepLightMinutes"] = sleep.lightMinutes
            cache["sleepAwakeMinutes"] = sleep.awakeMinutes
            cache["sleepScore"] = sleep.score
        }
        UserDefaults.standard.set(cache, forKey: "watchHealthKitCache")
    }

    private func cacheState() {
        let cache: [String: Any] = [
            "isFasting": isFasting,
            "fastStartTime": fastStartTime,
            "fastGoalHours": fastGoalHours,
            "isSleeping": isSleeping,
            "sleepStartTime": sleepStartTime,
            "sleepGoalHours": sleepGoalHours,
            "heartPoints": heartPoints,
            "lastUpdate": lastUpdate.timeIntervalSince1970
        ]
        UserDefaults.standard.set(cache, forKey: WatchState.cacheKey)
    }

    private func loadCachedState() {
        guard let cache = UserDefaults.standard.dictionary(forKey: WatchState.cacheKey) else { return }
        if let val = cache["isFasting"] as? Bool { isFasting = val }
        if let val = cache["fastStartTime"] as? Double { fastStartTime = val }
        if let val = cache["fastGoalHours"] as? Double { fastGoalHours = val }
        if let val = cache["isSleeping"] as? Bool { isSleeping = val }
        if let val = cache["sleepStartTime"] as? Double { sleepStartTime = val }
        if let val = cache["sleepGoalHours"] as? Double { sleepGoalHours = val }
        if let val = cache["heartPoints"] as? Int { heartPoints = val }
        if let val = cache["lastUpdate"] as? Double { lastUpdate = Date(timeIntervalSince1970: val) }

        // Load cached HealthKit data
        if let hkCache = UserDefaults.standard.dictionary(forKey: "watchHealthKitCache") {
            if let val = hkCache["todaySteps"] as? Int { todaySteps = val }
            if let val = hkCache["healthKitAvailable"] as? Bool { healthKitAvailable = val }
            if let val = hkCache["healthKitLastFetch"] as? Double { healthKitLastFetch = Date(timeIntervalSince1970: val) }
            if let val = hkCache["currentHeartRate"] as? Double { currentHeartRate = val }
            if let val = hkCache["restingHeartRate"] as? Int { restingHeartRate = val }
            if let val = hkCache["hrv"] as? Double { hrv = val }
            if let total = hkCache["sleepTotalMinutes"] as? Int, total > 0 {
                lastNightSleep = WatchSleepData(
                    totalMinutes: total,
                    deepMinutes: (hkCache["sleepDeepMinutes"] as? Int) ?? 0,
                    remMinutes: (hkCache["sleepRemMinutes"] as? Int) ?? 0,
                    lightMinutes: (hkCache["sleepLightMinutes"] as? Int) ?? 0,
                    awakeMinutes: (hkCache["sleepAwakeMinutes"] as? Int) ?? 0,
                    score: (hkCache["sleepScore"] as? Int) ?? 0
                )
            }
        }
    }
}
