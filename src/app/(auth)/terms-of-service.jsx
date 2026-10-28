import { LegalDocument } from "../../components/LegalDocument";
import { LEGAL_DOCUMENTS } from "../../data/legalDocuments";

export default function TermsOfServiceScreen() {
  return <LegalDocument {...LEGAL_DOCUMENTS.terms} />;
}
