import SwiftUI
import Combine

/// Sleep tracking toggle — start/stop with duration display
struct SleepToggleView: View {
    @EnvironmentObject var watchState: WatchState
    @State private var timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    @State private var showStopConfirm = false

    private let sleepIndigo = Color(red: 0.39, green: 0.4, blue: 0.95)

    var body: some View {
        VStack(spacing: 12) {
            // Moon icon
            Image(systemName: watchState.isSleeping ? "moon.fill" : "moon")
                .font(.system(size: 36))
                .foregroundColor(sleepIndigo)
                .symbolEffect(.pulse, isActive: watchState.isSleeping)

            if watchState.isSleeping {
                // Duration display
                Text(WatchState.formatElapsed(watchState.sleepElapsedSeconds))
                    .font(.system(.title3, design: .monospaced))
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                Text("Sleeping...")
                    .font(.caption2)
                    .foregroundColor(sleepIndigo)
            } else {
                Text("Sleep Tracking")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            // Toggle button
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
            .confirmationDialog("Stop sleeping?", isPresented: $showStopConfirm, titleVisibility: .visible) {
                Button("Wake Up", role: .destructive) { stopSleep() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text(WatchState.formatElapsed(watchState.sleepElapsedSeconds) + " so far")
            }
        }
        .padding(.horizontal, 8)
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
