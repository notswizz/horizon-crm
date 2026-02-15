import Foundation
import CoreLocation
import Observation

@Observable
final class LocationManager: NSObject, CLLocationManagerDelegate {
    var currentLocation: CLLocation?

    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        manager.requestWhenInUseAuthorization()
        manager.startUpdatingLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        currentLocation = locations.last
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        default:
            break
        }
    }

    /// Distance from user to a job (meters), or nil if either location is unavailable
    func distance(to job: Job) -> CLLocationDistance? {
        guard let userLoc = currentLocation,
              let lat = job.latitude,
              let lng = job.longitude else { return nil }
        return userLoc.distance(from: CLLocation(latitude: lat, longitude: lng))
    }

    /// Sort jobs by distance — geolocated jobs first (ascending), then non-geolocated (by newest)
    func sortedByDistance(_ jobs: [Job]) -> [Job] {
        guard currentLocation != nil else {
            return jobs.sorted { $0.createdAt > $1.createdAt }
        }
        let (withCoords, withoutCoords) = jobs.reduce(into: ([Job](), [Job]())) { result, job in
            if job.latitude != nil && job.longitude != nil {
                result.0.append(job)
            } else {
                result.1.append(job)
            }
        }
        let sortedNear = withCoords.sorted {
            (distance(to: $0) ?? .greatestFiniteMagnitude) < (distance(to: $1) ?? .greatestFiniteMagnitude)
        }
        let sortedFar = withoutCoords.sorted { $0.createdAt > $1.createdAt }
        return sortedNear + sortedFar
    }
}
