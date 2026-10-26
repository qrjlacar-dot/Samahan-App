import OptionToggle from "./OptionToggle";

const TICKET_OPTIONS = [
  { id: "regular", label: "Regular" },
  { id: "discounted", label: "Discounted" },
];

// Keep the screen's ticket API while sharing selection-button markup.
export default function TicketToggle({ ticketType, onSelectTicketType }) {
  return <OptionToggle options={TICKET_OPTIONS} value={ticketType} onChange={onSelectTicketType} />;
}
