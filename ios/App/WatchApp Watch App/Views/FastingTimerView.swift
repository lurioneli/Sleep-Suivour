import SwiftUI
import Combine

/// Fasting timer screen — circular progress ring with elapsed time and start/stop
struct FastingTimerView: View {
    @EnvironmentObject var watchState: WatchState
    @State private var timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    @State private var showStopConfirm = false

    // Sui green color
    private let suiGreen = Color(red: 0.13, green: 0.77, blue: 0.37)

    var body: some View {
        VStack(spacing: 8) {
            // Status label
            Text(watchState.isFasting ? "Fasting" : "Not Fasting")
                .font(.caption2)
                .foregroundColor(watchState.isFasting ? suiGreen : .gray)
                .textCase(.uppercase)

            // Progress ring + time
            ZStack {
                // Background ring
                Circle()
                    .stroke(Color.gray.opacity(0.2), lineWidth: 8)

                // Progress ring
                Circle()
                    .trim(from: 0, to: watchState.isFasting ? watchState.fastProgress : 0)
                    .stroke(suiGreen, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.5), value: watchState.fastProgress)

                // Center content
                VStack(spacing: 2) {
                    Text(WatchState.formatElapsed(watchState.fastElapsedSeconds))
                        .font(.system(.title2, design: .monospaced))
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    if watchState.isFasting {
                        Text("/ \(Int(watchState.fastGoalHours))h goal")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                }
            }
            .frame(width: 120, height: 120)

            // Start/Stop button
            Button(action: handleButtonTap) {
                Text(watchState.isFasting ? "Stop Fast" : "Start Fast")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(watchState.isFasting ? .red : .black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(watchState.isFasting ? Color.red.opacity(0.2) : suiGreen)
                    .cornerRadius(20)
            }
            .buttonStyle(.plain)
            .confirmationDialog("Stop fasting?", isPresented: $showStopConfirm, titleVisibility: .visible) {
                Button("Stop Fast", role: .destructive) { stopFast() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text(WatchState.formatElapsed(watchState.fastElapsedSeconds) + " so far")
            }
        }
        .padding(.horizontal, 8)
        .onReceive(timer) { _ in
            // Force refresh to update elapsed time display
            if watchState.isFasting {
                watchState.objectWillChange.send()
            }
        }
    }

    private func handleButtonTap() {
        if watchState.isFasting {
            showStopConfirm = true
        } else {
            startFast()
        }
    }

    private func startFast() {
        WatchConnectivityManager.shared.sendMessage(["action": "startFast"])
        watchState.isFasting = true
        watchState.fastStartTime = Date().timeIntervalSince1970 * 1000
        WKInterfaceDevice.current().play(.click)
    }

    private func stopFast() {
        WatchConnectivityManager.shared.sendMessage(["action": "stopFast"])
        watchState.isFasting = false
        WKInterfaceDevice.current().play(.click)
    }
}
