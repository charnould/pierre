/* DÉBUT : ** NE PAS MODIFIER */
import type { Config } from "../../utils/_schema";
/* FIN : ** NE PAS MODIFIER */

export default {
  id: "testing_purpose_1",
  display: "Test 1",
  show: [
    "demo_client",
    "demo_team",
    "default",
    "testing_purpose_1",
    "testing_purpose_2",
    "fake_profil",
  ],
  custom_data: {},
  api: [],
  protected: true,
  knowledge: {
    location: null,
    community: false,
    proprietary: false,
  },
  greeting: ["Cette configuration n'existe qu'à des fins de tests"],
  examples: [],
  disclaimer: null,
} as Config;
