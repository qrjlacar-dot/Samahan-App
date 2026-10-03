import { LegalDocument } from "../../components/LegalDocument";

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocument title="Privacy Policy">
      SAMAHAN is being developed to help users navigate around Cubao. The current account feature uses your name and email address.
        {"\n\n"}
        Maps and location access have not been added yet. Emergency contacts and favorite routes are also planned features.
        {"\n\n"}
        We will update this policy to explain how those features use your information before they are made available.
    </LegalDocument>
  );
}
