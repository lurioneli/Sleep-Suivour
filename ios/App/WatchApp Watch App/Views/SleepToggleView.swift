import SwiftUI
import Combine

/// Sleep tracking toggle — start/stop with duration display
struct SleepToggleView: View {
    @EnvironmentObject var watchState: WatchState
    @Environment(\.isLuminanceReduced) var isLuminanceReduced
    @State private var timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    @State private var showStopConfirm = false

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
                    Button("Wake Up", role: .destructive) { stopSleep() }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text(WatchState.formatElapsed(watchState.sleepElapsedSeconds) + " so far")
                }
            }
        }
        .padding(.horizontal, 8)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(watchState.isSleeping
            ? "Sleep tracking: \(WatchState.formatElapsed(watchState.sleepElapsedSeconds))"
            : "Sleep tracking inactive")
        .onReceive(timer) { _ in
            if watchState.isSleeping {
                watchState.objectWillChange.send()
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
        WatchConnectivityManager.shared.sendMessage(["action": "startSleep"])
        watchState.isSleeping = true
        watchState.sleepStartTime = Date().timeIntervalSince1970 * 1000
        WKInterfaceDevice.current().play(.click)
    }

    private func stopSleep() {
        WatchConnectivityManager.shared.sendMessage(["action": "stopSleep"])
        watchState.isSleeping = false
        WKInterfaceDevice.current().play(.click)
    }
}
