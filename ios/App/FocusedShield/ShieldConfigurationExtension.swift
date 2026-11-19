import ManagedSettings
import ManagedSettingsUI
import UIKit

// Schermata mostrata da iOS quando si apre un'app bloccata da Focus Time: logo di
// Focused, il sogno scritto dall'utente tra virgolette, "Fallo per te" e il bottone
// "Resta concentrato". Il testo arriva dall'app tramite l'App Group (la WebView lo
// scrive prima di far partire il blocco, gia' nella lingua dell'utente): qui dentro
// non c'e' rete ne' accesso ai dati dell'app.
//
// 1.5: sfondo nero pieno #000000 (nessuna sfocatura di sistema sotto) e configurazione
// costruita una volta sola, leggera: se l'estensione supera la memoria o il tempo iOS
// mostra la schermata grigia standard al posto della nostra.
final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    private static let black = UIColor(red: 0, green: 0, blue: 0, alpha: 1)

    private lazy var logo: UIImage? = {
        UIImage(named: "ShieldLogo", in: Bundle(for: ShieldConfigurationExtension.self), compatibleWith: nil)
            ?? UIImage(named: "ShieldLogo")
    }()

    private func configuration() -> ShieldConfiguration {
        let defaults = UserDefaults(suiteName: "group.org.focusedapp.app")
        let dream = (defaults?.string(forKey: "shield_dream") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let subtitleRaw = defaults?.string(forKey: "shield_subtitle") ?? ""
        let buttonRaw = defaults?.string(forKey: "shield_button") ?? ""
        let subtitle = subtitleRaw.isEmpty ? "Do it for yourself." : subtitleRaw
        let button = buttonRaw.isEmpty ? "Stay focused" : buttonRaw
        let title = dream.isEmpty ? "Focused" : "\u{201C}\(dream)\u{201D}"

        return ShieldConfiguration(
            backgroundBlurStyle: nil,
            backgroundColor: Self.black,
            icon: logo,
            title: ShieldConfiguration.Label(text: title, color: .white),
            subtitle: ShieldConfiguration.Label(text: subtitle, color: UIColor(white: 1, alpha: 0.6)),
            primaryButtonLabel: ShieldConfiguration.Label(text: button, color: Self.black),
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
