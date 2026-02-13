import SwiftUI

/// Main Watch navigation — tab view with fasting timer, sleep, powerups, and Heart Points
struct ContentView: View {
    @EnvironmentObject var watchState: WatchState

    var body: some View {
        TabView {
            FastingTimerView()
            SleepToggleView()
            PowerupsView()
            HeartPointsView()
        }
        .tabViewStyle(.verticalPage)
    }
}
