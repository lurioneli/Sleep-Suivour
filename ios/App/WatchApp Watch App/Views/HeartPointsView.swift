import SwiftUI

/// Heart Points display — score with colored ring
struct HeartPointsView: View {
    @EnvironmentObject var watchState: WatchState
    @Environment(\.isLuminanceReduced) var isLuminanceReduced

    private var ringColor: Color {
        let hp = watchState.heartPoints
        if hp >= 80 { return Color(red: 0.13, green: 0.77, blue: 0.37) }  // Green
        if hp >= 60 { return .yellow }
        if hp >= 40 { return .orange }
        return .red
    }

    private var progress: Double {
        return Double(min(100, max(0, watchState.heartPoints))) / 100.0
    }

    var body: some View {
        VStack(spacing: 8) {
            Text("Heart Points")
                .font(.caption2)
                .foregroundColor(.gray)
                .textCase(.uppercase)
                .opacity(isLuminanceReduced ? 0.5 : 1.0)

            ZStack {
                // Background ring
                Circle()
                    .stroke(Color.gray.opacity(isLuminanceReduced ? 0.1 : 0.2), lineWidth: 10)

                // Progress ring
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(ringColor.opacity(isLuminanceReduced ? 0.4 : 1.0), style: StrokeStyle(lineWidth: 10, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(isLuminanceReduced ? nil : .easeInOut(duration: 0.8), value: progress)

                // Center content
                VStack(spacing: 2) {
                    Image(systemName: "heart.fill")
                        .font(.title3)
                        .foregroundColor(ringColor.opacity(isLuminanceReduced ? 0.4 : 1.0))
                        .accessibilityHidden(true)

                    Text("\(watchState.heartPoints)")
                        .font(.system(.largeTitle, design: .rounded))
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .opacity(isLuminanceReduced ? 0.6 : 1.0)

                    Text("/ 100")
                        .font(.caption2)
                        .foregroundColor(.gray)
                        .opacity(isLuminanceReduced ? 0.4 : 1.0)
                }
            }
            .frame(width: 130, height: 130)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Heart Points: \(watchState.heartPoints) out of 100")
            .accessibilityValue("\(statusText)")

            // Status text
            Text(statusText)
                .font(.caption2)
                .foregroundColor(ringColor)
                .opacity(isLuminanceReduced ? 0.5 : 1.0)

            // Real health metrics from HealthKit (hidden in AOD)
            if !isLuminanceReduced && watchState.healthKitAvailable {
                HStack(spacing: 12) {
                    if let rhr = watchState.restingHeartRate {
                        VStack(spacing: 2) {
                            Image(systemName: "heart.fill")
                                .font(.caption2)
                                .foregroundColor(.red)
                                .accessibilityHidden(true)
                            Text("\(rhr)")
                                .font(.system(.caption, design: .rounded))
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                            Text("RHR")
                                .font(.system(size: 8))
                                .foregroundColor(.gray)
                        }
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("Resting heart rate \(rhr) beats per minute")
                    }

                    if let hrv = watchState.hrv {
                        VStack(spacing: 2) {
                            Image(systemName: "waveform.path.ecg")
                                .font(.caption2)
                                .foregroundColor(.cyan)
                                .accessibilityHidden(true)
                            Text("\(Int(hrv))")
                                .font(.system(.caption, design: .rounded))
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                            Text("HRV")
                                .font(.system(size: 8))
                                .foregroundColor(.gray)
                        }
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("Heart rate variability \(Int(hrv)) milliseconds")
                    }

                    if let hr = watchState.currentHeartRate {
                        VStack(spacing: 2) {
                            Image(systemName: "bolt.heart.fill")
                                .font(.caption2)
                                .foregroundColor(.green)
                                .accessibilityHidden(true)
                            Text("\(Int(hr))")
                                .font(.system(.caption, design: .rounded))
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                            Text("BPM")
                                .font(.system(size: 8))
                                .foregroundColor(.gray)
                        }
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("Current heart rate \(Int(hr)) beats per minute")
                    }
                }
                .padding(.top, 4)
            }
        }
    }

    private var statusText: String {
        let hp = watchState.heartPoints
        if hp >= 80 { return "Excellent!" }
        if hp >= 60 { return "Good" }
        if hp >= 40 { return "Getting there" }
        return "Keep going!"
    }
}
