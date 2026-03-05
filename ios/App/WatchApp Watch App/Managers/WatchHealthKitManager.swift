import HealthKit
import Foundation
import WatchKit
import WidgetKit

/// Reads HealthKit data directly on the Watch. No iPhone round-trip needed.
/// Writes fetched values into WatchState.shared for UI consumption.
@MainActor
class WatchHealthKitManager {
    static let shared = WatchHealthKitManager()

    private let healthStore = HKHealthStore()
    private var lastFetchDate: Date = .distantPast
    private let cacheTTL: TimeInterval = 300 // 5 minutes

    var isAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    private init() {}

    // MARK: - Read types (matches iPhone app)

    private var readTypes: Set<HKObjectType> {
        var types = Set<HKObjectType>()
        if let t = HKQuantityType.quantityType(forIdentifier: .stepCount) { types.insert(t) }
        if let t = HKQuantityType.quantityType(forIdentifier: .heartRate) { types.insert(t) }
        if let t = HKQuantityType.quantityType(forIdentifier: .restingHeartRate) { types.insert(t) }
        if let t = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN) { types.insert(t) }
        if let t = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) { types.insert(t) }
        return types
    }

    // MARK: - Authorization

    func requestAuthorization() async -> Bool {
        guard isAvailable else { return false }
        do {
            try await healthStore.requestAuthorization(toShare: [], read: readTypes)
            return true
        } catch {
            print("[HealthKit] Authorization error: \(error.localizedDescription)")
            return false
        }
    }

    // MARK: - Fetch All

    func refreshIfNeeded() async {
        guard isAvailable else { return }
        guard Date().timeIntervalSince(lastFetchDate) > cacheTTL else { return }
        await forceRefresh()
    }

    func forceRefresh() async {
        guard isAvailable else { return }
        lastFetchDate = Date()

        async let steps = fetchTodaySteps()
        async let sleep = fetchLastNightSleep()
        async let hr = fetchCurrentHeartRate()
        async let rhr = fetchRestingHeartRate()
        async let hrv = fetchHRV()

        let (s, sl, h, r, v) = await (steps, sleep, hr, rhr, hrv)

        let state = WatchState.shared
        state.todaySteps = s
        state.lastNightSleep = sl
        state.currentHeartRate = h
        state.restingHeartRate = r
        state.hrv = v
        state.healthKitAvailable = true
        state.healthKitLastFetch = Date()
        state.cacheHealthKitData()

        // Refresh complications with fresh data
        WidgetKit.WidgetCenter.shared.reloadAllTimelines()
    }

    // MARK: - Steps

    func fetchTodaySteps() async -> Int {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return 0 }

        let now = Date()
        let startOfDay = Calendar.current.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
                if let error = error {
                    print("[HealthKit] Steps error: \(error.localizedDescription)")
                    continuation.resume(returning: 0)
                    return
                }
                let count = Int(result?.sumQuantity()?.doubleValue(for: .count()) ?? 0)
                continuation.resume(returning: count)
            }
            healthStore.execute(query)
        }
    }

    // MARK: - Sleep

    func fetchLastNightSleep() async -> WatchSleepData? {
        guard let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else { return nil }

        let now = Date()
        let calendar = Calendar.current
        // Look back from 6PM yesterday to noon today to capture various sleep schedules
        var yesterday6pm = calendar.startOfDay(for: now)
        yesterday6pm = calendar.date(byAdding: .day, value: -1, to: yesterday6pm)!
        yesterday6pm = calendar.date(byAdding: .hour, value: 18, to: yesterday6pm)!
        let todayNoon = calendar.date(byAdding: .hour, value: 12, to: calendar.startOfDay(for: now))!

        let predicate = HKQuery.predicateForSamples(withStart: yesterday6pm, end: todayNoon, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: 200, sortDescriptors: [sortDescriptor]) { _, samples, error in
                if let error = error {
                    print("[HealthKit] Sleep error: \(error.localizedDescription)")
                    continuation.resume(returning: nil)
                    return
                }

                guard let samples = samples as? [HKCategorySample], !samples.isEmpty else {
                    continuation.resume(returning: nil)
                    return
                }

                var totalSeconds: TimeInterval = 0
                var deepSeconds: TimeInterval = 0
                var remSeconds: TimeInterval = 0
                var lightSeconds: TimeInterval = 0
                var awakeSeconds: TimeInterval = 0
                var earliest: Date?
                var latest: Date?

                for sample in samples {
                    let duration = sample.endDate.timeIntervalSince(sample.startDate)
                    let value = sample.value

                    // Skip "in bed" — not actual sleep
                    if value == HKCategoryValueSleepAnalysis.inBed.rawValue { continue }

                    if earliest == nil || sample.startDate < earliest! { earliest = sample.startDate }
                    if latest == nil || sample.endDate > latest! { latest = sample.endDate }

                    if value == HKCategoryValueSleepAnalysis.awake.rawValue {
                        awakeSeconds += duration
                        continue
                    }

                    // Actual sleep stages (iOS 16+)
                    if #available(watchOS 9.0, *) {
                        if value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue {
                            deepSeconds += duration
                        } else if value == HKCategoryValueSleepAnalysis.asleepREM.rawValue {
                            remSeconds += duration
                        } else if value == HKCategoryValueSleepAnalysis.asleepCore.rawValue {
                            lightSeconds += duration
                        } else {
                            // asleepUnspecified or asleep
                            lightSeconds += duration
                        }
                    } else {
                        lightSeconds += duration
                    }
                    totalSeconds += duration
                }

                guard totalSeconds > 0 else {
                    continuation.resume(returning: nil)
                    return
                }

                // Score: duration (40pts), deep% (25pts), REM% (25pts), awake penalty (10pts)
                let durationHours = totalSeconds / 3600
                let durationScore = min(40, (durationHours / 8.0) * 40)
                let deepPct = totalSeconds > 0 ? deepSeconds / totalSeconds : 0
                let deepScore = min(25, (deepPct / 0.20) * 25)
                let remPct = totalSeconds > 0 ? remSeconds / totalSeconds : 0
                let remScore = min(25, (remPct / 0.25) * 25)
                let awakePct = (totalSeconds + awakeSeconds) > 0 ? awakeSeconds / (totalSeconds + awakeSeconds) : 0
                let awakeScore = max(0, 10 - (awakePct / 0.10) * 10)

                let score = Int(durationScore + deepScore + remScore + awakeScore)

                let data = WatchSleepData(
                    totalMinutes: Int(totalSeconds / 60),
                    deepMinutes: Int(deepSeconds / 60),
                    remMinutes: Int(remSeconds / 60),
                    lightMinutes: Int(lightSeconds / 60),
                    awakeMinutes: Int(awakeSeconds / 60),
                    score: min(100, score),
                    startTime: earliest,
                    endTime: latest
                )
                continuation.resume(returning: data)
            }
            healthStore.execute(query)
        }
    }

    // MARK: - Heart Rate (most recent)

    func fetchCurrentHeartRate() async -> Double? {
        guard let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return nil }

        let now = Date()
        let tenMinAgo = now.addingTimeInterval(-600)
        let predicate = HKQuery.predicateForSamples(withStart: tenMinAgo, end: now, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: hrType, predicate: predicate, limit: 1, sortDescriptors: [sortDescriptor]) { _, samples, error in
                if let error = error {
                    print("[HealthKit] HR error: \(error.localizedDescription)")
                    continuation.resume(returning: nil)
                    return
                }
                guard let sample = samples?.first as? HKQuantitySample else {
                    continuation.resume(returning: nil)
                    return
                }
                let bpm = sample.quantity.doubleValue(for: HKUnit(from: "count/min"))
                continuation.resume(returning: bpm)
            }
            healthStore.execute(query)
        }
    }

    // MARK: - Resting Heart Rate

    func fetchRestingHeartRate() async -> Int? {
        guard let rhrType = HKQuantityType.quantityType(forIdentifier: .restingHeartRate) else { return nil }

        let now = Date()
        let yesterday = now.addingTimeInterval(-86400)
        let predicate = HKQuery.predicateForSamples(withStart: yesterday, end: now, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: rhrType, predicate: predicate, limit: 1, sortDescriptors: [sortDescriptor]) { _, samples, error in
                if let error = error {
                    print("[HealthKit] RHR error: \(error.localizedDescription)")
                    continuation.resume(returning: nil)
                    return
                }
                guard let sample = samples?.first as? HKQuantitySample else {
                    continuation.resume(returning: nil)
                    return
                }
                let bpm = Int(sample.quantity.doubleValue(for: HKUnit(from: "count/min")))
                continuation.resume(returning: bpm)
            }
            healthStore.execute(query)
        }
    }

    // MARK: - HRV

    func fetchHRV() async -> Double? {
        guard let hrvType = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN) else { return nil }

        let now = Date()
        let yesterday = now.addingTimeInterval(-86400)
        let predicate = HKQuery.predicateForSamples(withStart: yesterday, end: now, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: hrvType, predicate: predicate, limit: 1, sortDescriptors: [sortDescriptor]) { _, samples, error in
                if let error = error {
                    print("[HealthKit] HRV error: \(error.localizedDescription)")
                    continuation.resume(returning: nil)
                    return
                }
                guard let sample = samples?.first as? HKQuantitySample else {
                    continuation.resume(returning: nil)
                    return
                }
                let ms = sample.quantity.doubleValue(for: HKUnit.secondUnit(with: .milli))
                continuation.resume(returning: ms)
            }
            healthStore.execute(query)
        }
    }

    // MARK: - Background Refresh

    func scheduleBackgroundRefresh() {
        let targetDate = Date().addingTimeInterval(30 * 60)
        WKApplication.shared().scheduleBackgroundRefresh(
            withPreferredDate: targetDate,
            userInfo: nil
        ) { error in
            if let error = error {
                print("[HealthKit] Background refresh scheduling error: \(error.localizedDescription)")
            }
        }
    }
}

// MARK: - Data Models

struct WatchSleepData {
    var totalMinutes: Int = 0
    var deepMinutes: Int = 0
    var remMinutes: Int = 0
    var lightMinutes: Int = 0
    var awakeMinutes: Int = 0
    var score: Int = 0
    var startTime: Date?
    var endTime: Date?
}
