import SwiftUI

/// Main Watch navigation — tab view with fasting timer, sleep, powerups, and Heart Points
struct ContentView: View {
    @EnvironmentObject var watchState: WatchState
    @Environment(\.isLuminanceReduced) var isLuminanceReduced

    private let suiGreen = Color(red: 0.13, green: 0.77, blue: 0.37)

    var body: some View {
        ZStack {
            TabView {
                FastingTimerView()
                SleepToggleView()
                PowerupsView()
                HeartPointsView()
            }
            .tabViewStyle(.verticalPage)

            // Connectivity status — shown when iPhone is unreachable and data is stale
            if !watchState.isPhoneReachable && watchState.isStale && !isLuminanceReduced {
                VStack {
                    Spacer()
                    HStack(spacing: 4) {
                        Image(systemName: "iphone.slash")
                            .font(.caption2)
                            .accessibilityHidden(true)
                        Text(watchState.lastSyncedText)
                            .font(.caption2)
                    }
                    .foregroundColor(.orange.opacity(0.8))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(8)
                    .padding(.bottom, 2)
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("iPhone disconnected. Last synced \(watchState.lastSyncedText)")
                }
                .allowsHitTesting(false)
            }

            // Toast overlay — slides in from top when iPhone confirms a Watch action
            if watchState.showToast && !isLuminanceReduced {
                VStack {
                    HStack(spacing: 6) {
                        Image(systemName: "bolt.fill")
                            .font(.caption)
                            .foregroundColor(suiGreen)
                            .accessibilityHidden(true)
                        Text(watchState.toastTitle)
                            .font(.caption.weight(.bold))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.85))
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(suiGreen.opacity(0.5), lineWidth: 1)
                    )
                    Spacer()
                }
                .padding(.top, 4)
                .transition(.move(edge: .top).combined(with: .opacity))
                .animation(.easeInOut(duration: 0.3), value: watchState.showToast)
                .allowsHitTesting(false)
                .accessibilityElement(children: .combine)
                .accessibilityLabel(watchState.toastTitle)
            }
        }
    }
}
