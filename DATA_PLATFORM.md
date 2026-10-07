# OSRS Hub V51 Data Platform

Market data uses the public OSRS GE price stream fed by RuneLite observations. The website cannot directly read a user's local RuneLite client; a future RuneLite bridge would be required for private offer telemetry.

D1 now has durable structures for market snapshots, items, equipment, monsters, bosses, loot, skills, quests, methods and prayers. A scheduled cursor progressively mirrors the rich item/monster/prayer dataset from OSRSBox into our own database. OSRSBox documents its dataset as complete for those three categories.

Discord/OAuth/alert handlers remain separate and are not rewritten by the data layer.
