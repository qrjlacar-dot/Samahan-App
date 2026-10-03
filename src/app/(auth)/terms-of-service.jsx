import { LegalDocument } from "../../components/LegalDocument";

export default function TermsOfServiceScreen() {
  return (
    <LegalDocument title="Terms of Service">
      SAMAHAN is currently a prototype intended to help users navigate around Cubao.
        {"\n\n"}
        Maps, location access, emergency contacts, favorite routes, and trip notifications are still being developed. They should not be relied on until they are available and tested.
        {"\n\n"}
        We will update these terms to explain how those features work before they are made available.
    </LegalDocument>
  );
}
