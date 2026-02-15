import Foundation
import Observation
import FirebaseAuth
import FirebaseFirestore

@Observable
final class AuthManager {
    var user: FirebaseAuth.User?
    var displayName: String = ""
    var companyId: String?
    var companyName: String?
    var role: String = "user"
    var isLoading = true
    var needsCompanySetup = false
    var needsNameSetup = false
    var errorMessage: String?

    var isSignedIn: Bool { user != nil }
    var isAdmin: Bool { role == "admin" }
    var uid: String? { user?.uid }
    var email: String? { user?.email }

    private var authListener: AuthStateDidChangeListenerHandle?
    private var db: Firestore { Firestore.firestore() }
    private var started = false

    private let adminEmail = "swizz@gmail.com"

    init() {
        displayName = UserDefaults.standard.string(forKey: "inspectorName") ?? ""
    }

    deinit {
        if let authListener {
            Auth.auth().removeStateDidChangeListener(authListener)
        }
    }

    // MARK: - Start (call AFTER FirebaseApp.configure)

    func start() {
        guard !started else { return }
        started = true
        authListener = Auth.auth().addStateDidChangeListener { [weak self] _, firebaseUser in
            // Bounce to main actor since this callback fires on arbitrary thread
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.user = firebaseUser

                if let firebaseUser {
                    await self.fetchUserDoc(uid: firebaseUser.uid)
                } else {
                    self.companyId = nil
                    self.companyName = nil
                    self.role = "user"
                    self.needsCompanySetup = false
                    self.needsNameSetup = false
                    self.isLoading = false
                }
            }
        }
    }

    // MARK: - Fetch User Doc

    private func fetchUserDoc(uid: String) async {
        do {
            let doc = try await db.collection("users").document(uid).getDocument()
            if doc.exists, let data = doc.data() {
                self.companyId = data["companyId"] as? String
                self.companyName = data["companyName"] as? String
                self.role = data["role"] as? String ?? "user"

                if self.companyId == nil {
                    self.needsCompanySetup = true
                } else {
                    self.needsCompanySetup = false
                }

                let storedName = data["displayName"] as? String ?? ""
                if !storedName.isEmpty {
                    self.displayName = storedName
                    UserDefaults.standard.set(storedName, forKey: "inspectorName")
                }

                self.needsNameSetup = !self.needsCompanySetup && storedName.isEmpty && self.displayName.isEmpty
            } else {
                self.needsCompanySetup = true
                self.needsNameSetup = false
            }
        } catch {
            self.errorMessage = error.localizedDescription
        }
        self.isLoading = false
    }

    // MARK: - Sign In

    func signIn(email: String, password: String) async {
        errorMessage = nil
        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            self.user = result.user
            await fetchUserDoc(uid: result.user.uid)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Sign Up

    func signUpUser(email: String, password: String) async {
        errorMessage = nil
        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)
            self.user = result.user
            self.needsCompanySetup = true
            self.isLoading = false
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Sign Out

    func signOut() {
        do {
            try Auth.auth().signOut()
            user = nil
            companyId = nil
            companyName = nil
            role = "user"
            displayName = ""
            needsCompanySetup = false
            needsNameSetup = false
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Join Company (by code)

    func joinCompany(code: String) async {
        guard let uid = user?.uid else { return }
        let trimmed = code.trimmingCharacters(in: .whitespaces).uppercased()
        guard !trimmed.isEmpty else { return }
        errorMessage = nil

        do {
            let snap = try await db.collection("companies")
                .whereField("joinCode", isEqualTo: trimmed)
                .limit(to: 1)
                .getDocuments()

            guard let companyDoc = snap.documents.first else {
                errorMessage = "Invalid join code"
                return
            }

            let companyData = companyDoc.data()
            let foundCompanyId = companyDoc.documentID
            let foundCompanyName = companyData["name"] as? String ?? ""

            try await db.collection("users").document(uid).setData([
                "companyId": foundCompanyId,
                "companyName": foundCompanyName,
                "email": user?.email ?? "",
                "role": "user",
                "createdAt": FieldValue.serverTimestamp(),
            ], merge: true)

            self.companyId = foundCompanyId
            self.companyName = foundCompanyName
            self.role = "user"
            self.needsCompanySetup = false

            if displayName.isEmpty {
                needsNameSetup = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Save Display Name

    func saveDisplayName(_ name: String) async {
        guard let uid = user?.uid else { return }
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }

        displayName = trimmed
        UserDefaults.standard.set(trimmed, forKey: "inspectorName")
        needsNameSetup = false

        do {
            try await db.collection("users").document(uid).setData([
                "displayName": trimmed,
                "email": user?.email ?? "",
                "updatedAt": FieldValue.serverTimestamp(),
            ], merge: true)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
