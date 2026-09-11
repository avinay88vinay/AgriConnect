function ProduceIcon({
  name = "",
  category = "",
  size = 34,
}) {
  const value = `${name} ${category}`.toLowerCase().trim();

  const symbols = [
    ["green chilli", "🌶️"],
    ["green chili", "🌶️"],
    ["sweet lime", "🍈"],
    ["lady finger", "🌿"],
    ["bottle gourd", "🥒"],
    ["bitter gourd", "🥒"],
    ["ridge gourd", "🥒"],
    ["watermelon", "🍉"],
    ["muskmelon", "🍈"],
    ["pineapple", "🍍"],
    ["pomegranate", "🔴"],
    ["cauliflower", "🥦"],
    ["beetroot", "🫜"],
    ["chickpeas", "🫘"],
    ["red gram", "🫘"],
    ["toor dal", "🫘"],
    ["tomato", "🍅"],
    ["potato", "🥔"],
    ["onion", "🧅"],
    ["carrot", "🥕"],
    ["brinjal", "🍆"],
    ["eggplant", "🍆"],
    ["cabbage", "🥬"],
    ["spinach", "🥬"],
    ["okra", "🌿"],
    ["cucumber", "🥒"],
    ["chilli", "🌶️"],
    ["chili", "🌶️"],
    ["capsicum", "🫑"],
    ["pumpkin", "🎃"],
    ["radish", "🌱"],
    ["beet", "🫜"],
    ["peas", "🫛"],
    ["beans", "🫘"],
    ["apple", "🍎"],
    ["banana", "🍌"],
    ["mango", "🥭"],
    ["orange", "🍊"],
    ["papaya", "🥭"],
    ["guava", "🍐"],
    ["grapes", "🍇"],
    ["grape", "🍇"],
    ["lemon", "🍋"],
    ["mosambi", "🍈"],
    ["rice", "🌾"],
    ["wheat", "🌾"],
    ["maize", "🌽"],
    ["corn", "🌽"],
    ["millet", "🌾"],
    ["ragi", "🌾"],
    ["turmeric", "🟡"],
    ["ginger", "🫚"],
    ["garlic", "🧄"],
  ];

  const match = symbols.find(([key]) => value.includes(key));
  const symbol = match?.[1] || "🌱";

  return (
    <span
      role="img"
      aria-label={name || "Produce"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        fontSize: Math.round(size * 0.78),
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {symbol}
    </span>
  );
}

export default ProduceIcon;
