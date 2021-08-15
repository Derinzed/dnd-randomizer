class RandomGeneratorParser {

  static parseToEncounters(dataset) {
    return dataset.reduce(function (a, v) {
      a.push(RandomGeneratorParser.generateEncounterData(v));
      return a;
    }, []);
  }

  static generateEncounterData(encounter) {
    const encounterData = {};
    encounterData.difficulty = encounter.xp.difficulty
      .replace(" ", "")
      .toLowerCase();
    encounterData.xp = encounter.xp.xp.replace(" xp", "");
    encounterData.creatures = encounter.monsters.map((monster) => {
      return RandomGeneratorParser.generateCreatureData(monster);
    });
    encounterData.loot = encounter.treasure.map((loot) => {
      return RandomGeneratorParser.generateLootData(loot);
    });
  }

  static generateCreatureData(creature) {
    return {
      name: RandomGeneratorParser.cleanupCreatureName(creature.nameOfCreature),
      number: creature.numberOfCreatures,
      cr: creature.challengeRating,
    };
  }

  static cleanupCreatureName(name) {
    return name.replace(" ", "").toLowerCase();
  }

  static generateLootData(loot) {
    const quantity = parseInt(loot.split(" x ")[0]) || 1;
    const isGold = parseInt(loot.split("")[0]) && !loot.includes("x");
    const isScroll = RandomGeneratorParser.cleanupItemName(loot) === "spellscroll"
    const itemName = RandomGeneratorParser.cleanupItemName(loot,isScroll) || "";
    const displayName = loot;
    
    return {
      quantity: quantity,
      isGold: isGold,
      isScroll: isScroll,
      itemName: itemName,
      originalName: displayName,
    };
  }

  static wordsToCut() {
    return [""];
  }

  static cleanupItemName(name, isScroll=false) {
    let cleanName = "";
    const quantitySplit = name.split(" x ");
    cleanName = quantitySplit[quantitySplit.length - 1];
    cleanName = cleanName.replace(")", "");
    cleanName = cleanName.split("(")[isScroll ? 1:0];
    cleanName.replace(" ", "").toLowerCase();
    return cleanName;
  }
}
