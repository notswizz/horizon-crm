import Foundation
import MapKit
import Observation

@Observable
final class AddressCompleter: NSObject, MKLocalSearchCompleterDelegate {
    var suggestions: [MKLocalSearchCompletion] = []
    var isSearching = false

    private let completer = MKLocalSearchCompleter()

    override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = .address
    }

    var searchText: String = "" {
        didSet {
            guard searchText != oldValue else { return }
            if searchText.trimmingCharacters(in: .whitespaces).count < 3 {
                suggestions = []
                isSearching = false
                return
            }
            isSearching = true
            completer.queryFragment = searchText
        }
    }

    func clear() {
        searchText = ""
        suggestions = []
        isSearching = false
        completer.cancel()
    }

    /// Resolve a suggestion into a full address with coordinates
    func resolve(_ completion: MKLocalSearchCompletion) async -> MKMapItem? {
        let request = MKLocalSearch.Request(completion: completion)
        let search = MKLocalSearch(request: request)
        let response = try? await search.start()
        return response?.mapItems.first
    }

    // MARK: - MKLocalSearchCompleterDelegate

    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        suggestions = Array(completer.results.prefix(5))
        isSearching = false
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        isSearching = false
    }
}
