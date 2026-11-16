/** Public contact details — shared by the footer and the About page. */
export const contact = {
  phone: "+91 870 085 5689",
  phoneHref: "tel:+918700855689",
  address: "A-84, below Noida Sector 16 metro station, A Block, Sector 4, Noida, Uttar Pradesh 201301",
  // The same address split into parts for search-engine structured data
  // (src/lib/seo.js). Keep it in sync with `address` above.
  postalAddress: {
    streetAddress: "A-84, below Noida Sector 16 metro station, A Block, Sector 4",
    addressLocality: "Noida",
    addressRegion: "Uttar Pradesh",
    postalCode: "201301",
    addressCountry: "IN",
  },
  email: "arun@techotdsolutions.com",
  emailHref: "mailto:arun@techotdsolutions.com",
};
