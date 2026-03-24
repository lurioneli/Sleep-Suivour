import SwiftUI
import Combine

/// Fasting timer screen — circular progress ring with elapsed time and start/stop
struct FastingTimerView: View {
    @EnvironmentObject var watchState: WatchState
    @Environment(\.isLuminanceReduced) var isLuminanceReduced
    @State private var timer = Timer.publish(every: 1, on: .main, in: .common)
    @State private var showStopConfirm = false
    @State private var showFeelingPicker = false
    @State private var stopTimestamp: Double = 0

    // Sui green color
    private let suiGreen = Color(red: 0.13, green: 0.77, blue: 0.37)

    var body: some View {
        VStack(spacing: 8) {
            // Status label
            Text(watchState.isFasting ? "Fasting" : "Not Fasting")
                .font(.caption2)
                .foregroundColor(watchState.isFasting ? suiGreen : .gray)
                .textCase(.uppercase)
                .opacity(isLuminanceReduced ? 0.6 : 1.0)

            // Progress ring + time
            ZStack {
                // Background ring
                Circle()
                    .stroke(Color.gray.opacity(isLuminanceReduced ? 0.1 : 0.2), lineWidth: 8)

                // Progress ring
                Circle()
                    .trim(from: 0, to: watchState.isFasting ? watchState.fastProgress : 0)
                    .stroke(suiGreen.opacity(isLuminanceReduced ? 0.5 : 1.0), style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(isLuminanceReduced ? nil : .easeInOut(duration: 0.5), value: watchState.fastProgress)

                // Center content
                VStack(spacing: 2) {
                    Text(WatchState.formatElapsed(watchState.fastElapsedSeconds))
                        .font(.system(.title2, design: .monospaced))
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .opacity(isLuminanceReduced ? 0.6 : 1.0)

                    if watchState.isFasting {
                        Text("/ \(Int(watchState.fastGoalHours))h goal")
                            .font(.caption2)
                            .foregroundColor(.gray)
                            .opacity(isLuminanceReduced ? 0.4 : 1.0)
                    }
                }
            }
            .frame(width: 120, height: 120)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(watchState.isFasting
                ? "Fasting progress: \(WatchState.formatElapsed(watchState.fastElapsedSeconds)) of \(Int(watchState.fastGoalHours)) hour goal"
                : "Not fasting")
            .accessibilityValue(watchState.isFasting
                ? "\(Int(watchState.fastProgress * 100)) percent complete"
                : "")

            // Start/Stop button — hidden in always-on state
            if !isLuminanceReduced {
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
                .accessibilityLabel(watchState.isFasting ? "Stop fasting" : "Start fasting")
                .accessibilityHint(watchState.isFasting ? "Double tap to stop your current fast" : "Double tap to start a new fast")
                .confirmationDialog("Stop fasting?", isPresented: $showStopConfirm, titleVisibility: .visible) {
                    Button("Stop Fast", role: .destructive) {
                        stopTimestamp = Date().timeIntervalSince1970 * 1000
                        showFeelingPicker = true
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text(WatchState.formatElapsed(watchState.fastElapsedSeconds) + " so far")
                }
                .sheet(isPresented: $showFeelingPicker) {
                    FeelingPickerView(type: "fasting") { feeling in
                        stopFast(feeling: feeling)
                    }
                }

                // Step count from HealthKit
                if watchState.healthKitAvailable && watchState.todaySteps > 0 {
                    VStack(spacing: 2) {
                        HStack(spacing: 4) {
                            Image(systemName: "figure.walk")
                                .font(.caption2)
                                .foregroundColor(.cyan)
                                .accessibilityHidden(true)
                            Text("\(watchState.todaySteps.formatted()) steps")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                        HStack(spacing: 3) {
                            Image(systemName: "heart.text.clipboard")
                                .font(.system(size: 7))
                            Text("Apple Health")
                                .font(.system(size: 8))
                        }
                        .foregroundColor(.gray.opacity(0.5))
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("\(watchState.todaySteps) steps today from Apple Health")
                }
            }
        }
        .padding(.horizontal, 8)
        .onReceive(timer) { _ in
            watchState.objectWillChange.send()
        }
        .onChange(of: watchState.isFasting) {
            if watchState.isFasting {
                timer = Timer.publish(every: 1, on: .main, in: .common)
                _ = timer.connect()
            } else {
                timer = Timer.publish(every: 1, on: .main, in: .common)
            }
        }
        .onAppear {
            if watchState.isFasting {
                _ = timer.connect()
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
        let timestamp = Date().timeIntervalSince1970 * 1000
        WatchConnectivityManager.shared.sendMessage(["action": "startFast", "timestamp": timestamp])
        watchState.isFasting = true
        watchState.fastStartTime = timestamp
        WKInterfaceDevice.current().play(.click)
    }

    private func stopFast(feeling: String?) {
        var message: [String: Any] = ["action": "stopFast", "timestamp": stopTimestamp]
        if let feeling = feeling {
            message["feeling"] = feeling
        }
        WatchConnectivityManager.shared.sendMessage(message)
        watchState.isFasting = false
        WKInterfaceDevice.current().play(.click)
    }
}
