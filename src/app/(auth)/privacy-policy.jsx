import { LegalDocument } from "../../components/LegalDocument";
import { LEGAL_DOCUMENTS } from "../../data/legalDocuments";

export default function PrivacyPolicyScreen() {
  return <LegalDocument {...LEGAL_DOCUMENTS.privacy} />;
}
