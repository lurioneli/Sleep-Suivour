import SwiftUI

/// Main Watch navigation — tab view with fasting timer, sleep, powerups, and Heart Points
struct ContentView: View {
    @EnvironmentObject var watchState: WatchState

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

            // Toast overlay — slides in from top when iPhone confirms a Watch action
            if watchState.showToast {
                VStack {
                    HStack(spacing: 6) {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 12))
                            .foregroundColor(suiGreen)
                        Text(watchState.toastTitle)
                            .font(.system(size: 13, weight: .bold, design: .rounded))
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
            }
        }
    }
}
