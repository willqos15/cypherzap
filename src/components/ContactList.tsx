import type { Contact } from "../types/Contact";
import type { ContactStatus } from "../types/Queue";

type Props = {
contacts: Contact[];
selectedContacts: number[];
contactStatus: ContactStatus;
sending: boolean;
onToggle: (id: number) => void;
onToggleAll: () => void;
};

export default function ContactList({
contacts,
selectedContacts,
contactStatus,
sending,
onToggle,
onToggleAll
}: Props) {
const allSelected =
selectedContacts.length === contacts.length;

return ( <section> <h2>Contatos</h2>


  <button
    type="button"
    onClick={onToggleAll}
    disabled={sending}
  >
    {allSelected
      ? "Desmarcar todos"
      : "Selecionar todos"}
  </button>

  <div style={{ marginTop: 15 }}>
    {contacts.map((contact) => {
      const selected =
        selectedContacts.includes(contact.id);

      const state =
        contactStatus[contact.id];

      return (
        <div
          key={contact.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 0"
          }}
        >
          <input
            type="checkbox"
            checked={selected}
            disabled={sending}
            onChange={() =>
              onToggle(contact.id)
            }
          />

          <span>{contact.name}</span>

          <span>{contact.number}</span>

          {state === "sending" && (
            <span>⏳</span>
          )}

          {state === "success" && (
            <span>✅</span>
          )}

          {state === "error" && (
            <span>❌</span>
          )}
        </div>
      );
    })}
  </div>
</section>


);
}
