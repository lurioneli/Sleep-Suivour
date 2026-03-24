import SwiftUI
import Combine

/// Sleep tracking toggle — start/stop with duration display
struct SleepToggleView: View {
    @EnvironmentObject var watchState: WatchState
    @Environment(\.isLuminanceReduced) var isLuminanceReduced
    @State private var timer = Timer.publish(every: 1, on: .main, in: .common)
    @State private var showStopConfirm = false
    @State private var showFeelingPicker = false
    @State private var stopTimestamp: Double = 0

    private let sleepIndigo = Color(red: 0.39, green: 0.4, blue: 0.95)

    var body: some View {
        VStack(spacing: 12) {
            // Moon icon
            Image(systemName: watchState.isSleeping ? "moon.fill" : "moon")
                .font(.system(size: 36))
                .foregroundColor(sleepIndigo.opacity(isLuminanceReduced ? 0.5 : 1.0))
                .symbolEffect(.pulse, isActive: watchState.isSleeping && !isLuminanceReduced)
                .accessibilityHidden(true)

            if watchState.isSleeping {
                // Duration display
                Text(WatchState.formatElapsed(watchState.sleepElapsedSeconds))
                    .font(.system(.title3, design: .monospaced))
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .opacity(isLuminanceReduced ? 0.6 : 1.0)

                Text("Sleeping...")
                    .font(.caption2)
                    .foregroundColor(sleepIndigo)
                    .opacity(isLuminanceReduced ? 0.4 : 1.0)
            } else if let sleep = watchState.lastNightSleep, !isLuminanceReduced {
                // Last night's sleep summary
                Text("Last Night")
                    .font(.caption2)
                    .foregroundColor(sleepIndigo)
                    .textCase(.uppercase)

                Text(formatSleepDuration(sleep.totalMinutes))
                    .font(.system(.title3, design: .monospaced))
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                Text("\(sleep.score) / 100")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundColor(sleepScoreColor(sleep.score))

                HStack(spacing: 3) {
                    Image(systemName: "heart.text.clipboard")
                        .font(.system(size: 7))
                    Text("Apple Health")
                        .font(.system(size: 8))
                }
                .foregroundColor(.gray.opacity(0.5))
            } else {
                Text("Sleep Tracking")
                    .font(.caption)
                    .foregroundColor(.gray)
                    .opacity(isLuminanceReduced ? 0.5 : 1.0)
            }

            // Toggle button — hidden in always-on state
            if !isLuminanceReduced {
                Button(action: handleButtonTap) {
                    Text(watchState.isSleeping ? "Wake Up" : "Start Sleep")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(watchState.isSleeping ? .white : .black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(watchState.isSleeping ? sleepIndigo.opacity(0.4) : sleepIndigo)
                        .cornerRadius(20)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(watchState.isSleeping ? "Wake up" : "Start sleep tracking")
                .accessibilityHint(watchState.isSleeping ? "Double tap to stop sleep tracking" : "Double tap to start tracking your sleep")
                .confirmationDialog("Stop sleeping?", isPresented: $showStopConfirm, titleVisibility: .visible) {
                    Button("Wake Up", role: .destructive) {
                        stopTimestamp = Date().timeIntervalSince1970 * 1000
                        showFeelingPicker = true
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text(WatchState.formatElapsed(watchState.sleepElapsedSeconds) + " so far")
                }
                .sheet(isPresented: $showFeelingPicker) {
                    FeelingPickerView(type: "sleep") { feeling in
                        stopSleep(feeling: feeling)
                    }
                }
            }
        }
        .padding(.horizontal, 8)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(watchState.isSleeping
            ? "Sleep tracking: \(WatchState.formatElapsed(watchState.sleepElapsedSeconds))"
            : "Sleep tracking inactive")
        .onReceive(timer) { _ in
            watchState.objectWillChange.send()
        }
        .onChange(of: watchState.isSleeping) {
            if watchState.isSleeping {
                timer = Timer.publish(every: 1, on: .main, in: .common)
                _ = timer.connect()
            } else {
                timer = Timer.publish(every: 1, on: .main, in: .common)
            }
        }
        .onAppear {
            if watchState.isSleeping {
                _ = timer.connect()
            }
        }
    }

    private func handleButtonTap() {
        if watchState.isSleeping {
            showStopConfirm = true
        } else {
            startSleep()
        }
    }

    private func startSleep() {
        let timestamp = Date().timeIntervalSince1970 * 1000
        WatchConnectivityManager.shared.sendMessage(["action": "startSleep", "timestamp": timestamp])
        watchState.isSleeping = true
        watchState.sleepStartTime = timestamp
        WKInterfaceDevice.current().play(.click)
    }

    private func stopSleep(feeling: String?) {
        var message: [String: Any] = ["action": "stopSleep", "timestamp": stopTimestamp]
        if let feeling = feeling {
            message["feeling"] = feeling
        }
        WatchConnectivityManager.shared.sendMessage(message)
        watchState.isSleeping = false
        WKInterfaceDevice.current().play(.click)
    }

    private func formatSleepDuration(_ minutes: Int) -> String {
        let h = minutes / 60
        let m = minutes % 60
        return "\(h)h \(m)m"
    }

    private func sleepScoreColor(_ score: Int) -> Color {
        if score >= 80 { return Color(red: 0.13, green: 0.77, blue: 0.37) }
        if score >= 60 { return .yellow }
        if score >= 40 { return .orange }
        return .red
    }
}
