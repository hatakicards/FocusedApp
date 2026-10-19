import ManagedSettings
import ManagedSettingsUI
import UIKit

// Schermata mostrata da iOS quando si apre un'app bloccata da Focus Time: logo di
// Focused, il sogno scritto dall'utente tra virgolette, "Fallo per te" e il bottone
// "Resta concentrato". Il testo arriva dall'app tramite l'App Group (la WebView lo
// scrive prima di far partire il blocco, gia' nella lingua dell'utente): qui dentro
// non c'e' rete ne' accesso ai dati dell'app.
final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    private let defaults = UserDefaults(suiteName: "group.org.focusedapp.app")

    private func configuration() -> ShieldConfiguration {
        let dream = defaults?.string(forKey: "shield_dream") ?? ""
        let subtitle = defaults?.string(forKey: "shield_subtitle") ?? "Do it for yourself."
        let button = defaults?.string(forKey: "shield_button") ?? "Stay focused"
        let title = dream.isEmpty ? "Focused" : "\u{201C}\(dream)\u{201D}"

        return ShieldConfiguration(
            backgroundBlurStyle: nil,
            backgroundColor: UIColor.black,
            icon: UIImage(named: "ShieldLogo"),
            title: ShieldConfiguration.Label(text: title, color: .white),
            subtitle: ShieldConfiguration.Label(text: subtitle, color: UIColor(white: 1, alpha: 0.6)),
            primaryButtonLabel: ShieldConfiguration.Label(text: button, color: .black),
            primaryButtonBackgroundColor: .white,
            secondaryButtonLabel: nil
        )
    }

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        configuration()
    }

    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        configuration()
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        configuration()
    }

    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        configuration()
    }
}
