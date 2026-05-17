export interface IKnowProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  title: string;
  department: string;
  iknow_id: string;
}

// Simulates R-14 and R-18: auto-populate applicant profile from iKnow SSO.
// Replace with real OIDC/SAML token claims once the iKnow provider is wired.
export function getMockIKnowProfile(): IKnowProfile {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    first_name: "Марија",
    last_name: "Петровска",
    email: "m.petrovska@finki.ukim.edu.mk",
    title: "Вонреден Професор",
    department: "Катедра за компјутерски системи и мрежи",
    iknow_id: "FINKI-2023-001",
  };
}
