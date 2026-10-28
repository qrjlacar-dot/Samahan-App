const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const harness = require("./helpers/hook-harness.cjs");
const root = path.resolve(__dirname, "../src");
const expected = [
  "qrjlacar@tip.edu.ph",
  "qjssanpablo@tip.edu.ph",
  "qhllancin@tip.edu.ph",
  "qrrmorano26@tip.edu.ph",
];
function fixture(fail = false) {
  const opened = [],
    alerts = [];
  const { runtime } = harness();
  const load = createLoader({
    "react/jsx-runtime": runtime,
    "react-native": {
      View: "View",
      Text: "Text",
      Image: "Image",
      TouchableOpacity: "Link",
      StyleSheet: { create: (s) => s },
      Linking: {
        openURL: async (url) => {
          opened.push(url);
          if (fail) throw Error("No email app");
        },
      },
      Alert: { alert: (...args) => alerts.push(args) },
    },
    "../constants/scale": {
      scale: (value) => value,
      scaleFont: (value) => value,
    },
    "../constants/images": { IMAGES: { logo: "logo", wordmark: "wordmark" } },
    "./PageLayout": { PageLayout: "PageLayout" },
  });
  return { load, opened, alerts };
}
function expand(tree) {
  if (Array.isArray(tree)) return tree.map(expand);
  if (!tree || typeof tree !== "object") return tree;
  if (typeof tree.type === "function") return expand(tree.type(tree.props));
  return {
    ...tree,
    props: { ...tree.props, children: expand(tree.props?.children) },
  };
}
function nodes(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  if (!tree || typeof tree !== "object") return [];
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (!tree || typeof tree !== "object")
    return tree == null || typeof tree === "boolean" ? "" : String(tree);
  return text(tree.props?.children);
}
for (const [name, count, title] of [
  ["privacy-policy", 9, "Privacy Policy"],
  ["terms-of-service", 7, "Terms of Service"],
]) {
  test(`${title}: bold, sequential sentence-case headings, no draft notice, and all four contacts`, async () => {
    const f = fixture();
    const Page = f.load(path.join(root, `app/(auth)/${name}.jsx`)).default;
    const tree = expand(Page());
    const headings = nodes(tree, "Text").filter((n) => n.props.accessibilityRole === "header");
    assert.equal(text(headings[0]), title);
    assert.equal(headings.length, count + 1);
    for (const [index, heading] of headings.slice(1).entries()) {
      assert.match(text(heading), new RegExp(`^${index + 1}\\. [A-Z]`));
      assert.equal(heading.props.style.fontWeight, "700");
    }
    assert.doesNotMatch(text(tree), /\bdraft\b/i);
    assert.match(text(tree), /Last updated: October 27, 2026/);
    const links = nodes(tree, "Link");
    assert.deepEqual(
      links.map((n) => n.props.accessibilityLabel),
      expected,
    );
    for (const link of links) {
      assert.equal(link.props.accessibilityRole, "link");
      await link.props.onPress();
    }
    assert.deepEqual(
      f.opened,
      expected.map((email) => `mailto:${email}`),
    );
    assert.equal(f.alerts.length, 0);
  });
}
test("an unavailable email app shows the address instead of throwing or silently failing", async () => {
  const f = fixture(true);
  const Contacts = f.load(path.join(root, "components/LegalContactList.jsx")).LegalContactList;
  const link = nodes(expand(Contacts()), "Link")[0];
  await assert.doesNotReject(link.props.onPress());
  assert.equal(f.alerts[0][0], "Unable to open email");
  assert.ok(f.alerts[0][1].includes(expected[0]));
});
test("shared policy data retains storage, location, account and calling disclosures", () => {
  const { LEGAL_DOCUMENTS } = fixture().load(path.join(root, "data/legalDocuments.js"));
  const privacy = LEGAL_DOCUMENTS.privacy.sections.flatMap((s) => s.paragraphs).join(" ");
  const terms = LEGAL_DOCUMENTS.terms.sections.flatMap((s) => s.paragraphs).join(" ");
  for (const pattern of [
    /Firebase Authentication/,
    /Cloud Firestore/,
    /Geoapify/,
    /Google Maps/,
    /Apple Maps/,
    /newest 100 records/,
    /Signing out does not erase/,
    /no.*account-deletion button/,
    /does not read your phone's address book/,
    /does not send these alerts through a remote push/,
  ])
    assert.match(privacy, pattern);
  assert.match(terms, /phone-call permission/);
  assert.match(terms, /Tracking pauses when the app enters the background/);
});
test("policy entry links stay visible and Google introduction is removed", () => {
  for (const page of ["app/(auth)/login.jsx", "app/(auth)/sign-up.jsx", "app/(tabs)/profile.jsx"])
    assert.match(fs.readFileSync(path.join(root, page), "utf8"), /<LegalLinks/);
  assert.equal(fs.existsSync(path.join(root, "app/(auth)/google-consent.jsx")), false);
});
