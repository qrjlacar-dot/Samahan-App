import AsyncStorage from "@react-native-async-storage/async-storage";

// The current project has no Firebase auth setup. Pass a real user ID here
// when authentication is connected to keep each account's contacts separate.
export const getStorageKey = (userId = "guest") =>
  `@samahan_emergency_contacts_${userId}`;

export const cleanPhoneNumber = (number) => number.replace(/[\s-]/g, "");

export const isValidPhoneNumber = (number) =>
  /^09\d{9}$/.test(cleanPhoneNumber(number));

export async function loadContacts(userId = "guest") {
  const saved = await AsyncStorage.getItem(getStorageKey(userId));
  if (saved === null) return [];

  const contacts = JSON.parse(saved);
  if (!Array.isArray(contacts) || contacts.some((contact) =>
    !contact || typeof contact.id !== "string" ||
    typeof contact.name !== "string" || typeof contact.phone !== "string"
  )) {
    throw new Error("Invalid stored contacts");
  }
  return contacts;
}

export async function saveContacts(contacts, userId = "guest") {
  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(contacts));
}
