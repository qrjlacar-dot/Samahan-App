import OptionToggle from "./OptionToggle";

const JEEP_OPTIONS = [
  { id: "jeep-traditional", label: "Traditional" },
  { id: "jeep-modern", label: "Modern" },
];

// Reuse the ticket-toggle layout without changing the jeepney option values.
export default function JeepTypeToggle({ value, onChange }) {
  return (
    <OptionToggle
      options={JEEP_OPTIONS}
      value={value}
      onChange={onChange}
      accessibilityRole="button"
    />
  );
}
